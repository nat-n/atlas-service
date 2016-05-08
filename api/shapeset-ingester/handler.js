'use strict';

var Promise = require('bluebird');
const {
  loadObj,
  writeObj,
  createManifest
} = require('../lib/shapeset-helpers.js');

const importShapeset = (bucket) => (shapeset) => {
  const {name, meshes} = shapeset;

  // add build tag to shapeset version
  const version = `${shapeset.version}+${Date.now()}`;
  shapeset.version = version;
  console.info("Processing shapeset:", shapeset.name, shapeset.version)

  return Promise.all(meshes.map((mesh) => {
      var meshKey = `${name}/${version}/meshes/${mesh.name}.json`;
      var data = JSON.stringify(mesh);
      return writeObj(bucket, meshKey, data)
        .then(() => { return { name: mesh.name, size: data.length }});
    })).then((meshSizes) => {
      var meshIndexKey = `${name}/${version}/meshIndex.json`;
      var meshIndex = meshSizes.reduce((acc, m) => {
        acc[m.name] = m.size;
        return acc;
      }, {});

      var manifestKey = `${name}/${version}/manifest.json`;
      var manifest = createManifest(shapeset);
      return Promise.join(
        writeObj(bucket, manifestKey, JSON.stringify(manifest)),
        writeObj(bucket, meshIndexKey, JSON.stringify(meshIndex))
      );
    });
}

export default (event, context) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

  console.info("Responing to put at:", key);

  loadObj(bucket, key)
    .then(importShapeset(bucket))
    .then(() => context.succeed("Imported Shapeset."))
    .error((err) => {
      context.fail(`Error getting object ${key} from bucket ${bucket}.` +
        'Make sure they exist and your bucket is in the same region as this function.');
    });
}
