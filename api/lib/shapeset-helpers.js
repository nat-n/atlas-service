var Promise = require('bluebird');
var semver = require('semver');

const aws = require('aws-sdk');
const s3 = new aws.S3({apiVersion: '2006-03-01'});

export function configureAws(event) {
  if (event.isOffline) {
    aws.config.update({
      credentials: new aws.SharedIniFileCredentials({
        profile: 'atlas-service-offline'
      }),
      region: 'eu-west-1'
    });
  }
}

export function loadObj(Bucket, Key) {
  console.info("Loading object: ", Bucket, Key);

  return new Promise((resolve, reject) => {
    var data = '';
    s3.getObject({Bucket, Key})
      .on('httpData', (chunk) => data += chunk)
      .on('httpDone', () => resolve(JSON.parse(data)))
      .on('error', reject)
      .send();
  });
}

export function checkObj(Bucket, Key) {
  console.info("Checking object: ", Bucket, Key);

  return new Promise((resolve, reject) => {
    s3.headObject({Bucket, Key}, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

export function writeObj(Bucket, Key, Body, params={}) {
  console.info("Writing object: ", Bucket, Key);
  return new Promise((resolve, reject) => {
    s3.putObject(Object.assign({
        Bucket,
        Key,
        Body,
        ContentType: 'application/json'
      }, params), (err, data) => {
        if (err) reject(err);
        resolve(data);
      });
  });
}

export function listShapesets(Bucket) {
  return new Promise((resolve, reject) => {
    s3.listObjects({
        Bucket: Bucket,
        Delimiter: '/',
      }, (err, data) => {
        if (err) return reject(err);
        var versions = [];
        data.CommonPrefixes.forEach((dir) => {
          if (dir.Prefix.match(/^[A-Za-z\-\d\.]+\/$/)) {
            versions.push(dir.Prefix.slice(0, dir.Prefix.length - 1));
          }
        });
        resolve(versions);
    });
  });
}

export function listVersions(Bucket, shapesetName) {
  return new Promise((resolve, reject) => {
    console.info('List versions for:', Bucket, shapesetName)
    s3.listObjects({
        Bucket: Bucket,
        Delimiter: '/',
        Prefix: `${shapesetName}/`
      }, (err, data) => {
        if (err) return reject(err);
        var versions = [];
        data.CommonPrefixes.forEach((obj) => {
          var re = new RegExp(`${shapesetName}/(.*?)/`)
          var m = obj.Prefix.match(re);
          if (!m || !semver.valid(m[1])) {
            return;
          }
          versions.push(m[1])
        });
        resolve(versions);
    });
  });
}

export function resolveVersion(bucket, name, version) {
  return listVersions(bucket, name)
    .then((versions) => {
      if (versions.indexOf(version) >= 0) {
        return Promise.resolve(version);
      }
      var matches = versions.filter((v) => v.split('+')[0] === version).sort()
      return Promise.resolve(matches[matches.length - 1]);
    });
}

export function createManifest(shapeset) {
  var {name, version, shapes, meshes} = shapeset,
      shapesById    = {},
      indexedShapes = [];
  for (var shapeId in shapes) {
    shapesById[shapeId] = {
      id: shapeId,
      label: shapes[shapeId],
      neighbours: []
    };
    indexedShapes.push(shapesById[shapeId]);
  }
  meshes.forEach((mesh) => {
    let shapeIds = mesh.name.split('-');
    if (shapeIds[0] !== '0') {
      shapesById[shapeIds[0]].neighbours.push(shapeIds[1]);
    }
    shapesById[shapeIds[1]].neighbours.push(shapeIds[0]);
  });

  return {
    name,
    version,
    shapes: indexedShapes
  };
}

// Encodes comma seperated list of meshes as 4 bytes per mesh
// WARNING: uses radix 36 so will brake if there are more than 1295 (36^2-1) shapes
export function encodeMeshList(meshIds) {
  return meshIds.map((meshId) => {
    return meshId.split('-').map((shapeId) => {
      var encodedShapeId = parseInt(shapeId, 10).toString(36);
      if (encodedShapeId.length < 2) {
        return '0' + encodedShapeId;
      }
      return encodedShapeId;
    }).join('')
  }).join('');
}

export function decodeMeshList(encodedMeshIds) {
  return encodedMeshIds.match(/.{4}/g).map((encodedMeshId) => {
      return parseInt(encodedMeshId.slice(0, 2), 36) +
      '-' +
      parseInt(encodedMeshId.slice(2, 4), 36);
  });
}
