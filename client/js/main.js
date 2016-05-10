
// Point SceneJS to the bundled plugins
SceneJS.setConfigs({
    pluginPath:"./plugins"
});
// Define scene
var scene = SceneJS.createScene({
  nodes:[
    {
      type:"lookAt",
      eye:{ y:5, z:7 },
      look:{ x:0, y:1, z:0 },
      nodes:[
        {
          type:"material",
          color:{ r:0.3, g:0.3, b:1.0 },
          nodes:[
            {
              type:"rotate",
              id:"myRotate",
              y:1.0,
              angle:0,
              nodes:[
                {
                  type:"geometry/teapot"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
});
// On each frame, spin the teapot a little bit
scene.getNode("myRotate", (myRotate) => {
  var angle = 0;
  scene.on("tick", () => myRotate.setAngle(angle += 0.5));
});
