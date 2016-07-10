import 'whatwg-fetch';
import Dexie from 'dexie';
import Promise from 'bluebird';


/*
TODO:
- keep local caches of:
  - known shapesets & versions
  - shapeset manifests
*/


class ShapeSet {
  constructor(shapeset, version, client) {
    // client.
  }

  haveMesh(shape1, shape2) {

  }
}

class Region {
  // intended to be transient, main purpose being to get a mesh out
  constructor(name, shapeset, version, shapes=[], {client=new AtlasClient(), dataRequest, visible=true}) {
    this.name     = name;
    this.shapeset = shapeset;
    this.version  = version;
    this.shapes   = Object.freeze(shapes.slice(0));
    this.visible  = visible;
    this.color    = [0.5, 0.5, 0.5, 1];
    this._client  = client;
    this.asMesh   = dataRequest || this._initData(); // .then??
    this.meshes   = [];
    this.isEmpty  = !this.shapes.length;
    this.ready    = false;

    this.asMesh.then((mesh) => {
      this.ready = true;
      this.mesh = mesh
      return this.mesh;
    });
  }

  _initData() {
    if (!this.shapes.length) {
      return Promise.resolve({
        faces: [],
        vertex_normals: [],
        vertex_positions: []
      });
    }

    return this._client.getShapeset(this.shapeset, this.version)
      .then(({name, version, shapes}) => {
        if (this.distroyed) {
          return;
        }
        let meshes = [];

        var regionMembers = {};
        this.shapes.forEach((shape) => {
          // var shape = this._client.fromCache(name, version).shapesByLabel[shapeLabel];
          regionMembers[shape.id] = shape.neighbours;
        });
        for (let shapeId in regionMembers) {
          var neighbours = regionMembers[shapeId];
          neighbours.forEach((otherShapeId) => {
            if (!regionMembers.hasOwnProperty(otherShapeId)) {
              meshes.push(this.constructor.toMeshId(shapeId, otherShapeId))
            }
          });
        }

        return this._client.getMeshes(name, version, meshes);
      }).then(({meshes}) => {
        if (this.distroyed) {
          return;
        }
        this.meshes = meshes || [];
        var regionMembers = this.shapes.map((shape) => shape.id);
        return this.constructor._compose(regionMembers, meshes);
      });
  }

  static _compose(regionShapes, meshes) {
    var vPositions          = [],
        vNormals            = [],
        fIndices            = [],
        fNormals            = {},
        borders             = {},
        allBorderVerts      = {};

    var allVerts = {};
    var borderNormals = {};

    meshes.forEach(function (mesh) {
      var i, vi, vi3, bi, len, averageNormal,
          meshBorderVerts = new Set(), // indices of all border vertices in mesh
          // map border indices in mesh onto corresponding indices in vPositions
          indexMap = {};

      // build meshBorderVerts and indexMap
      for (bi in mesh.borders) {
        if (bi in borders) {
          for (i = 0, len = mesh.borders[bi].length; i < len; i++) {
            meshBorderVerts.add(mesh.borders[bi][i]);
            indexMap[mesh.borders[bi][i]] = borders[bi][i];
          }
        }
      }

      // dertmine whether this mesh is natural to the region or needs inverting
      var mustInvert = regionShapes.indexOf(mesh.name.split('-')[0]) != -1;

      // keep track of which index should be assigned to the next vertex
      var newIndex = vPositions.length / 3 - 1;
      for (vi = 0, len = mesh.verts.length / 3; vi < len; vi++) {
        // only copy over non-border vertices
        if (!meshBorderVerts.has(vi)) {
          // reindex remaining vertices
          indexMap[vi] = (newIndex += 1);
          // copy over vertices and normals
          vi3 = vi * 3;
          vPositions.push(mesh.verts[vi3],
                          mesh.verts[vi3+1],
                          mesh.verts[vi3+2]);
          // ensure normals face outwards
          if (mustInvert) {
            vNormals.push(-mesh.norms[vi3],
                          -mesh.norms[vi3+1],
                          -mesh.norms[vi3+2]);
          } else {
            vNormals.push(mesh.norms[vi3],
                          mesh.norms[vi3+1],
                          mesh.norms[vi3+2]);
          }
        }
      }

      var fA, fB, fC, fA3, fB3, fC3, fNormal, fX,
          aIsBorder = false,
          bIsBorder = false,
          cIsBorder = false,
          borderFaceNormals = {};
      for (i = 0, len = mesh.faces.length; i < len; i += 3) {
        fA = indexMap[mesh.faces[i]];
        fB = indexMap[mesh.faces[i+1]];
        fC = indexMap[mesh.faces[i+2]];

        if (mustInvert) {
            fX = fA;
            fA = fB;
            fB = fX;
        }

        fA3 = fA * 3 + 1;
        fB3 = fB * 3 + 1;
        fC3 = fC * 3 + 1;

        fIndices.push(fA, fB, fC);
      }

      // remap and copy borders from mesh.borders to borders
      for (bi in mesh.borders) {
        if (!(bi in borders)) {
          borders[bi] = [];
          for (i = 0, len = mesh.borders[bi].length; i < len; i++) {
            borders[bi].push(indexMap[mesh.borders[bi][i]]);
          }
        }
      }
    });

    return {
      vertex_positions: vPositions,
      vertex_normals: vNormals,
      faces: fIndices
    };
  }

  static toMeshId(shapeId1, shapeId2) {
    if (parseInt(shapeId1, 10) < parseInt(shapeId2, 10)) {
      return `${shapeId1}-${shapeId2}`;
    } else {
      return `${shapeId2}-${shapeId1}`;
    }
  }

  hasShape(shape) {
    return this.indexOfShape(shape) >= 0;
  }

  indexOfShape(shape) {
    // TODO: not this...
    // work out why/where shape is being copied and deal with it.
    for (var i = 0; i < this.shapes.length; i++) {
      if (this.shapes[i].id === shape.id) {
        return i;
      }
    }
    return -1;
  }

  toggleShape(shape) {
    var updatedShapes = [];
    var shapeIndex = this.indexOfShape(shape);
    if (shapeIndex >= 0) {
      updatedShapes = this.shapes.filter((s) => s.id !== shape.id);
    } else {
      updatedShapes = this.shapes.concat([shape]);
    }
    return new this.constructor(
      this.name,
      this.shapeset,
      this.version,
      updatedShapes,
      {
        client: this._client,
        dataRequest: this._dataRequest,
        visible: this.visible
      });
  }

  toggleVisibility() {
    return new this.constructor(
      this.name,
      this.shapeset,
      this.version,
      this.shapes,
      {
        client: this._client,
        dataRequest: this._dataRequest,
        visible: !this.visible
      });
  }

  destroy() {
    // TODO: cleanup pending promises and stuff?
    this.distroyed = true;
  }
}

class MeshData {
  constructor() {

  }
}


class AtlasClient {
  constructor(baseUrl) {
    this._baseUrl = baseUrl;

    // TODO: cache shapesets and versions in heap

    this._initIndexedDB();

    this.cache = {};
  }

  _initIndexedDB() {
    window.Dexie = Dexie;
    this.db = new Dexie('AtlasClient');
    this.db.version(1).stores({
      shapesets: '[name+version], name, version, *shapes',
      meshes: '[shapesetName+shapesetVersion+id], shapesetName, shapesetVersion, id, mesh'
    });

    this.db.open().catch((error) => {
      alert('Uh oh : ' + error);
    });
  }

  _cacheMeshes(shapesetName, shapesetVersion, meshes) {
    this.db.meshes.bulkPut(meshes.map((mesh) => ({
      shapesetName,
      shapesetVersion,
      id: mesh.name,
      mesh
    })));
  }


  _loadMeshes(shapesetName, shapesetVersion, meshIds) {
    var targets = meshIds.map((meshId) => [shapesetName, shapesetVersion, meshId]);
    return this.db.meshes.where().anyOf(targets).toArray()
      .then((meshes) => meshes.map((mesh) => mesh.mesh));
  }

  // fromCache(name, version) {
  //   var [mainVersion, buildVersion] = version.split('+');
  //   if (!buildVersion) {
  //     buildVersion = Object.keys(this.cache[name][mainVersion])[0];
  //   }
  //   return this.cache[name][mainVersion][buildVersion];
  // }

  get baseUrl() {
    return this._baseUrl || this.constructor._baseUrl;
  }

  static setDefaultBaseUrl(baseUrl) {
    this._baseUrl = baseUrl;
  }

  listShapesets() {
    return this._fetch();
  }

  listVersions(name) {
    return this._fetch(`/${name}`);
  }

  getShapeset(name, version) {
    // TODO: cache manifest with full version (including build version)
    //       but provide it without... gonna need to think about this!

    // maybe should use full version everywhere except for in the UI??

    return this._fetch(`/${name}/${version}`).then(({name, version, shapes}) => {
      // var [mainVersion, buildVersion] = version.split('+');

      // this.cache[name] = this.cache[name] || {};
      // this.cache[name][mainVersion] = this.cache[name][mainVersion] || {};
      // this.cache[name][mainVersion][buildVersion] = (
      //   this.cache[name][mainVersion][buildVersion] ||
      //   {shapesByID: {}, shapesByLabel: {}});
      // var byId = this.cache[name][mainVersion][buildVersion].shapesByID
      // var byLabel = this.cache[name][mainVersion][buildVersion].shapesByLabel
      shapes.forEach((shape) => {
        Object.freeze(shape);
        // byId[shape.id] = shape;
        // byLabel[shape.label] = shape;
      });

      return { name, version: version, shapes };
    });
  }

  getMeshes(shapesetName, shapesetVersion, meshIds) {
    // TODO:
    // - keep track of requested/pending meshes to save double requests
    // - retry for missing meshes

    //

    var result = {
      name: shapesetName,
      version: shapesetVersion,
      meshes: []
    };

    // see what meshes are available from IndexedDB
    return this._loadMeshes(shapesetName, shapesetVersion, meshIds)
      // get available meshes from IndexedDB cache
      .then((meshes) => {
        var meshIdSet = new Set(meshIds);
        meshes.forEach((mesh) => {
          result.meshes.push(mesh);
          meshIdSet.delete(mesh.name);
        });
        return meshIdSet;
      })
      // fetch remaining meshes from server
      .then((meshIdSet) => {
        if (meshIdSet.size > 0) {
          return this._fetchMeshes(shapesetName, shapesetVersion, Array.from(meshIdSet));
        } else {
          return {meshes: []};
        }
      })
      // merge responses from cache and from fetch
      .then(({meshes}) => {
        meshes.forEach((mesh) => result.meshes.push(mesh));
        return result;
      });
  }

  _fetchMeshes(shapesetName, shapesetVersion, meshIds) {
    var returnedVersion;
    // sort meshIds for increased cache hit
    return this._fetch(`/${shapesetName}/${shapesetVersion}/${meshIds.sort().join(',')}`)
      .then((response) => {
        if (response.status === 'Response too large') {
          return Promise.all(
              response.responseUrls.map(() => {
                return fetch(response.responseUrls, { mode: 'cors' })
                  .then((response) => response.json());
              })
            ).then((s3Responses) => {
              // merge responses into one
              var s3Response = {
                meshes: [],
                missingMeshes: []
              };
              s3Responses.forEach((r) => {
                s3Response.name = r.name;
                s3Response.version = r.version;
                r.meshes.forEach((m) => s3Response.meshes.push(m));
                r.missingMeshes.forEach((m) => s3Response.missingMeshes.push(m));
              });
              return s3Response;
            });
        }
        return response;
      })
      // unpack and cache retrieved meshes
      .then((response) => {
        response.meshes = response.meshes.map(({borders, faces, name, norms, verts}) => {
          return {
            name,
            borders,
            faces: faces.split(',').map((x) => parseInt(x, 10)),
            norms: norms.split(',').map((x) => parseFloat(x)),
            verts: verts.split(',').map((x) => parseFloat(x))
          };
        });
        this._cacheMeshes(response.name, response.version, response.meshes);
        return response;
      });
  }

  // getMeshesFor(name, version, shapes) {
  //   var meshes = [];
  //   // TODO: determine which meshes are required for a region consisting of shapes

  //   return meshes;
  // }

  _fetch(path='') {
    return fetch(`${this.baseUrl}shapesets${path}`, {mode: 'cors'})
      .then((response) => response.json());
  }

  // getRegions() {
  //   // create regions and batch mesh requests
  // }
}

AtlasClient.Region = Region;
AtlasClient.setDefaultBaseUrl('https://n25auwh1jf.execute-api.eu-west-1.amazonaws.com/dev/');

export default AtlasClient;
