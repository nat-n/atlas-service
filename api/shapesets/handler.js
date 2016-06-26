'use strict';

var Promise = require('bluebird');
const aws = require('aws-sdk');
const s3  = new aws.S3({apiVersion: '2006-03-01'});

// Required to stay with 1024 limit for s3 object key size
// 240 * 4 == 960
// which combined with 21 bytes of packaging,
// leaves 43 bytes for combined shapeset name and version.
const MAX_MESHES = 240;

const {
  listShapesets, listVersions, resolveVersion,
  loadObj, writeObj, checkObj,
  configureAws,
  encodeMeshList
} = require('../lib/shapeset-helpers.js');

const {
  REGION,
  SHAPESET_BUCKET_NAME,
  RESPONSE_BUCKET_NAME,
  RESPONSE_BUCKET_URL,
  MAX_RESPONSE_SIZE
} = require('../lib/config.js');

function shapesetIndex(context) {
  listShapesets(SHAPESET_BUCKET_NAME)
    .then((shapesetNames) => {
      context.succeed({shapesets: shapesetNames});
    })
    .error((err) => context.fail(err));
}

function shapesetVersions(name, context) {
  listVersions(SHAPESET_BUCKET_NAME, name)
    .then((versions) => {
      var versionSet = new Set();
      versions.forEach((v) => versionSet.add(v.split('+')[0]));
      context.succeed({name: name, versions: [...versionSet]});
    })
    .error((err) => context.fail(err));
}


function shapesetManifest(name, version, context) {
  resolveVersion(SHAPESET_BUCKET_NAME, name, version).then((fullVersion) => {
    const key = `${name}/${fullVersion}/manifest.json`;
    return loadObj(SHAPESET_BUCKET_NAME, key)
  })
  .then((manifest) => context.succeed(manifest))
  .error((err) => context.fail(err));
}

function planResponses(meshIds, name, version) {
  var responses = [{
    meshIds: []
  }];
  var latest = responses[responses.length-1].meshIds;
  for (var i = 0; i < meshIds.length; i += 1) {
    latest.push(meshIds[i]);
    if (latest.length >= MAX_MESHES) {
      latest = [];
      responses.push({ meshIds: latest });
    }
  }
  return responses;
}


var meshIndexCache;
function loadMeshes(name, version, plannedResponse) {
  plannedResponse.meshes = [];
  plannedResponse.missingMeshes = [];
  // load all requested meshes & the meshIndex in parallel
  var meshIndexPromise;
  if (meshIndexCache) {
    var expectedSize = plannedResponse.meshIds.reduce((acc, meshId) => {
      return acc + meshIndexCache[meshId];
    }, 0);
    console.info("Expected total meshes size:", expectedSize);
    plannedResponse.expectedSize = expectedSize;
    meshIndexPromise = Promise.resolve();
  } else {
    var meshIndexKey = `${name}/${version}/meshIndex.json`;
    meshIndexPromise = loadObj(SHAPESET_BUCKET_NAME, meshIndexKey)
      .then((meshIndex) => {
        meshIndexCache = meshIndex;
        var expectedSize = plannedResponse.meshIds.reduce((acc, meshId) => {
          return acc + meshIndex[meshId];
        }, 0);
        console.info("Expected total meshes size:", expectedSize);
        plannedResponse.expectedSize = expectedSize;
      });
  }

  return Promise.join(
    meshIndexPromise,
    Promise.all(plannedResponse.meshIds.map((meshId) => {         // use Promise.map ??
      const key = `${name}/${version}/meshes/${meshId}.json`;
      return loadObj(SHAPESET_BUCKET_NAME, key)
        .then((mesh) => plannedResponse.meshes.push(mesh))
        .error(() => plannedResponse.missingMeshes.push(meshId))
        .catch(() => plannedResponse.missingMeshes.push(meshId))
    }))
  ).then(() => plannedResponse);
}

function shapesetMeshes(name, version, meshIdsStr, context) {
  // uniquify meshIds
  var meshIds = [...new Set(meshIdsStr.split(','))],
      plannedResponses = planResponses(Array.from(meshIds), name, version),
      missingMeshes = [],
      responsePayloads;

  // determine the exact version match
  resolveVersion(SHAPESET_BUCKET_NAME, name, version)
  .then((fullVersion) => {
    version = fullVersion;
    plannedResponses.forEach((r) =>
      r.responseKey = `${name}/${version}/${encodeMeshList(r.meshIds)}.json`);
  })
  // Check if there is already a chached responses to this request
  .then(() => {
    return Promise.map(plannedResponses, (plannedResponse) => {
      return checkObj(RESPONSE_BUCKET_NAME, plannedResponse.responseKey)
        // if responseExists then pass on a flag to say so
        .then(() => {
          plannedResponse.exists = true;
          plannedResponse.url = `${RESPONSE_BUCKET_URL}/${plannedResponse.responseKey}`;
          return plannedResponse;
        })
        // else fetch assets required to compose and predict size of response
        .catch(() => {
          plannedResponse.exists = false;
          plannedResponse.url = `${RESPONSE_BUCKET_URL}/${plannedResponse.responseKey}`;
          return loadMeshes(name, version, plannedResponse);
        })
    })
  })
  // finally compose response/respond as appropriate
  .then((plannedResponses) => {
    if (plannedResponses.length === 1 && plannedResponses[0].expectedSize < MAX_RESPONSE_SIZE) {
      // response small enough to return directly, we're done!
      context.succeed({
        name,
        version,
        meshes: plannedResponses[0].meshes,
        missingMeshes: plannedResponses[0].missingMeshes
      });
    } else {
      // request params or response size are too large to return directly
      var responseUrls = [];
      return Promise.map(plannedResponses, (plannedResponse) => {
        // all responses posted to s3 regardless of size
        responseUrls.push(plannedResponse.url);

        if (plannedResponse.exists) {
          return Promise.resolve();
        } else {
          let response = {
            name,
            version,
            meshes: plannedResponses[0].meshes,
            missingMeshes: plannedResponses[0].missingMeshes
          };
          var ACLHeader = { ACL: 'public-read' };
          return writeObj(RESPONSE_BUCKET_NAME,
            plannedResponse.responseKey,
            JSON.stringify(response),
            ACLHeader);
        }
      }).then(() => responseUrls);
    }
  })
  .then((responseUrls) => context.succeed({
    status: 'Response too large',
    responseUrls
  }))
  .error((err) => {
    context.fail(err);
  });
}

export default (event, context) => {
  // TODO: 404 for invalid shapeset or version

  configureAws(event);

  if (event.meshIds) {
    shapesetMeshes(event.name, event.version, event.meshIds, context);
  } else if (event.version) {
    shapesetManifest(event.name, event.version, context);
  } else if (event.name) {
    shapesetVersions(event.name, context);
  } else {
    shapesetIndex(context);
  }
};
