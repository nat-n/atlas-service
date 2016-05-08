'use strict';

var Promise = require('bluebird');
const aws = require('aws-sdk');
const s3  = new aws.S3({apiVersion: '2006-03-01'});

const {
  listShapesets, listVersions, resolveVersion,
  loadObj, writeObj, checkObj,
  configureAws
} = require('../../../lib/shapeset-helpers.js');

const {
  REGION,
  SHAPESET_BUCKET_NAME,
  RESPONSE_BUCKET_NAME,
  RESPONSE_BUCKET_URL,
  MAX_RESPONSE_SIZE
} = require('../../../lib/config.js');

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

function shapesetMeshes(name, version, meshIdsStr, context) {
  // uniquify meshIds
  var meshIds = [...new Set(meshIdsStr.split(','))],
      missingMeshes = [],
      responseKey;

  // determine the exact version match
  resolveVersion(SHAPESET_BUCKET_NAME, name, version)
  .then((fullVersion) => {
    version = fullVersion;
    responseKey = `${name}/${version}/${meshIdsStr}.json`;
  })
  // Check if there is already a chached response to this request
  .then(() => checkObj(RESPONSE_BUCKET_NAME, responseKey))
  // if responseExists then pass on a flag to say so
  .then(() => [null, null, 'responseExists'])
  // else fetch assets required to compose and predict size of response
  .catch(() => {
    // load all requested meshes & the meshIndex in parallel
    var meshIndexKey = `${name}/${version}/meshIndex.json`;
    var meshIndexPromise = loadObj(SHAPESET_BUCKET_NAME, meshIndexKey)
      .then((meshIndex) => {
        var expectedSize = meshIds.reduce((acc, meshId) => {
          return acc + meshIndex[meshId];
        }, 0);
        console.info("Expected total meshes size:", expectedSize);
        return expectedSize;
      });

    return Promise.join(
      meshIndexPromise,
      Promise.all(meshIds.map((meshId) => {
        const key = `${name}/${version}/meshes/${meshId}.json`;
        return loadObj(SHAPESET_BUCKET_NAME, key)
          .error(() => missingMeshes.push(meshId))
          .catch(() => missingMeshes.push(meshId))
      }))
    )
  })
  // finally compose response/respond as appropriate
  .spread((expectedSize, meshes, responseExists) => {
    var responseUrl = `${RESPONSE_BUCKET_URL}/${responseKey}`;
    var response = { name, version, meshes, missingMeshes };
    if (responseExists) {
      context.succeed({ status: 'Response too large', responseUrl });
    } else if (expectedSize > MAX_RESPONSE_SIZE) {
      var ACLHeader = {ACL: 'public-read'};
      writeObj(RESPONSE_BUCKET_NAME, responseKey, JSON.stringify(response), ACLHeader)
      .then(() => {
        context.succeed({ status: 'Response too large', responseUrl });
      });
    } else {
      context.succeed(response);
    }
  })
  .error((err) => {
    context.fail(err);
  });
}

module.exports.handler = (event, context) => {
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
