import React from 'react';
const { PropTypes } = React;

import THREE from 'three';
import PureRenderMixin from 'react/lib/ReactComponentWithPureRenderMixin';

import MouseInput from '../lib/MouseInput';

class Region extends React.Component {
  static propTypes = {
  };

  constructor(props, context) {
    super(props, context);

    this.color = new THREE.Color(Math.random() * 0xffffff);

    const hsl = this.color.getHSL();

    hsl.s = Math.min(1, hsl.s * 1.1);
    hsl.l = Math.min(1, hsl.l * 1.1);

    const { h, s, l } = hsl;

    this.hoverColor = new THREE.Color().setHSL(h, s, l);
    this.pressedColor = 0xff0000;

    this.state = {
      hovered: false,
      pressed: false,
      vertices: [],
      faces: []
    };
  }

  // shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate;

  componentWillUnmount() {
    document.removeEventListener('mouseup', this._onDocumentMouseUp);
  }

  _onMouseEnter = () => {
    this.setState({ hovered: true });

    const { onMouseEnter } = this.props;

    onMouseEnter();
  };

  _onMouseDown = (event, intersection) => {
    event.preventDefault();
    event.stopPropagation();

    const {
      position,
    } = this.state;

    const {
      onDragStart,
      camera,
    } = this.props;

    dragPlane.setFromNormalAndCoplanarPoint(backVector.clone()
      .applyQuaternion(camera.quaternion), intersection.point);

    this._offset = intersection.point.clone().sub(position);

    document.addEventListener('mouseup', this._onDocumentMouseUp);
    document.addEventListener('mousemove', this._onDocumentMouseMove);

    this.setState({ pressed: true });

    onDragStart();
  };

  _onDocumentMouseMove = (event) => {
    event.preventDefault();

    const {
      mouseInput,
    } = this.props;

    const ray:THREE.Ray = mouseInput.getCameraRay(new THREE
      .Vector2(event.clientX, event.clientY));

    const intersection = dragPlane.intersectLine(new THREE.Line3(
      ray.origin,
      ray.origin.clone()
        .add(ray.direction.clone().multiplyScalar(10000))
    ));

    if (intersection) {
      this.setState({
        position: intersection.sub(this._offset),
      });
    }
  };

  _onDocumentMouseUp = (event) => {
    event.preventDefault();

    document.removeEventListener('mouseup', this._onDocumentMouseUp);
    document.removeEventListener('mousemove', this._onDocumentMouseMove);

    const {
      onDragEnd,
    } = this.props;

    onDragEnd();

    this.setState({ pressed: false });
  };

  _onMouseLeave = () => {
    if (this.state.hovered) {
      this.setState({ hovered: false });
    }

    const {
      onMouseLeave,
    } = this.props;

    onMouseLeave();
  };

  _ref = (mesh) => {
    const {
      onCreate,
    } = this.props;

    onCreate(mesh);
  };

  componentWillMount() {
    this.setState({ geometry: this.generateGeometry() });
  }

  generateGeometry() {
    var vertex_positions = this.props.region.mesh.vertex_positions,
        face_indices     = this.props.region.mesh.faces,
        vertices         = [],
        faces            = [],
        i;
    for (i = 0; i < vertex_positions.length; i+=3) {
      vertices.push(new THREE.Vector3(
        vertex_positions[i]*5,                      // TODO : shouldn't do scaling here
        vertex_positions[i + 1]*5,
        vertex_positions[i + 2]*5
      ));
    };
    for (i = 0; i < face_indices.length; i+=3) {
      faces.push(new THREE.Face3(
        face_indices[i],
        face_indices[i + 1],
        face_indices[i + 2]
      ));
    };

    const geometry = new THREE.Geometry();
    geometry.vertices = vertices;
    geometry.faces = faces;
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();
    return geometry;
  }

  render() {
    return (
      <group>
        <mesh>
          <geometry vertices={this.state.geometry.vertices}
                    faces={this.state.geometry.faces}/>
          <meshPhongMaterial color={this.color}/>
        </mesh>
      </group>
    );
  }
}

export default Region;
