
function PlanetBufferGeometry( radius, detail, noiseControls ) {

	THREE.BufferGeometry.call( this );

    this.type = 'PolyhedronBufferGeometry';

    const t = ( 1 + Math.sqrt( 5 ) ) / 2;

	const vertices = [
		- 1, t, 0, 	1, t, 0, 	- 1, - t, 0, 	1, - t, 0,
		 0, - 1, t, 	0, 1, t,	0, - 1, - t, 	0, 1, - t,
		 t, 0, - 1, 	t, 0, 1, 	- t, 0, - 1, 	- t, 0, 1
	];

	const indices = [
		 0, 11, 5, 	0, 5, 1, 	0, 1, 7, 	0, 7, 10, 	0, 10, 11,
		 1, 5, 9, 	5, 11, 4,	11, 10, 2,	10, 7, 6,	7, 1, 8,
		 3, 9, 4, 	3, 4, 2,	3, 2, 6,	3, 6, 8,	3, 8, 9,
		 4, 9, 5, 	2, 4, 11,	6, 2, 10,	8, 6, 7,	9, 8, 1
    ];

	this.parameters = {
		vertices: vertices,
		indices: indices,
		radius: radius,
        detail: detail,
        noiseControls: noiseControls
    };
    
    points = {};

    this.faces = [];

	radius = radius || 1;
	detail = detail || 0;

	// default buffer data

	const vertexBuffer = [];
	const uvBuffer = [];
    const noise3D = makeNoise3D(noiseControls.seed);

	// the subdivision creates the vertex buffer data

	subdivide( detail );

	// all vertices should lie on a conceptual sphere with a given radius

	//applyRadius( radius );

	// finally, create the uv data

	generateUVs();

	// build non-indexed geometry

	this.setAttribute( 'position', new THREE.Float32BufferAttribute( vertexBuffer, 3 ) );
	this.setAttribute( 'normal', new THREE.Float32BufferAttribute( vertexBuffer.slice(), 3 ) );
	this.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvBuffer, 2 ) );
    this.setAttribute( 'elevation', new THREE.BufferAttribute( new Float32Array( this.attributes.position.count ), 1 ) );

	if ( detail === 0 ) {
		this.computeVertexNormals(); // flat normals
	} else {
		this.normalizeNormals(); // smooth normals
    }
    
    this.generateElevation = generateElevation;

	// helper functions

	function subdivide( detail ) {

		const a = new THREE.Vector3();
		const b = new THREE.Vector3();
		const c = new THREE.Vector3();

		// iterate over all faces and apply a subdivison with the given detail value

		for ( let i = 0; i < indices.length; i += 3 ) {

			// get the vertices of the face

			getVertexByIndex( indices[ i + 0 ], a );
			getVertexByIndex( indices[ i + 1 ], b );
			getVertexByIndex( indices[ i + 2 ], c );

			// perform subdivision

			subdivideFace( a, b, c, detail );

		}

	}

	function subdivideFace( a, b, c, detail ) {

		const cols = Math.pow( 2, detail );

		// we use this multidimensional array as a data structure for creating the subdivision

		const v = [];

		// construct all of the vertices for this subdivision

		for ( let i = 0; i <= cols; i ++ ) {

			v[ i ] = [];

			const aj = a.clone().lerp( c, i / cols );
			const bj = b.clone().lerp( c, i / cols );

			const rows = cols - i;

			for ( let j = 0; j <= rows; j ++ ) {

				if ( j === 0 && i === cols ) {

					v[ i ][ j ] = aj;

				} else {

					v[ i ][ j ] = aj.clone().lerp( bj, j / rows );

				}

			}

		}

		// construct all of the faces

		for ( let i = 0; i < cols; i ++ ) {

			for ( let j = 0; j < 2 * ( cols - i ) - 1; j ++ ) {

				const k = Math.floor( j / 2 );

				if ( j % 2 === 0 ) {

					pushVertex( v[ i ][ k + 1 ] );
					pushVertex( v[ i + 1 ][ k ] );
					pushVertex( v[ i ][ k ] );

				} else {

					pushVertex( v[ i ][ k + 1 ] );
					pushVertex( v[ i + 1 ][ k + 1 ] );
					pushVertex( v[ i + 1 ][ k ] );

				}

			}

		}

    }

    function getElevation(vertex){
        const layers = 6
        var noise_value = 0
        var frequence = noiseControls.base_roughness
        var amplitude = 1

        for(var i = 0;i<layers;i++){
            var v = noise3D(vertex.x * frequence, vertex.y * frequence, vertex.z * frequence);
            noise_value += (v + 1) * 0.5 * amplitude
            frequence *= noiseControls.roughness
            amplitude *= noiseControls.persistence
        }

        noise_value = noise_value - noiseControls.min_value;

        return noise_value * noiseControls.strength
    }
    
    async function generateElevation() {
        const vertex = new THREE.Vector3();
        for ( let i = 0; i < this.attributes.position.count; i ++ ) {
 			vertex.x = vertexBuffer[ i*3 + 0 ];
			vertex.y = vertexBuffer[ i*3 + 1 ];
			vertex.z = vertexBuffer[ i*3 + 2 ];
            var key = vertex.x.toString()+vertex.y.toString()+vertex.z.toString();
            if(points[key].elevation == null){
                points[key].elevation = await getElevation(vertex);
            }

            this.attributes.elevation.array[i] = points[key].elevation;
        }
    }

	function generateUVs() {

		const vertex = new THREE.Vector3();

		for ( let i = 0; i < vertexBuffer.length; i += 3 ) {

			vertex.x = vertexBuffer[ i + 0 ];
			vertex.y = vertexBuffer[ i + 1 ];
			vertex.z = vertexBuffer[ i + 2 ];

			const u = azimuth( vertex ) / 2 / Math.PI + 0.5;
			const v = inclination( vertex ) / Math.PI + 0.5;
			uvBuffer.push( u, 1 - v );

		}

		correctUVs();

		correctSeam();

	}

	function correctSeam() {

		// handle case when face straddles the seam, see #3269

		for ( let i = 0; i < uvBuffer.length; i += 6 ) {

			// uv data of a single face

			const x0 = uvBuffer[ i + 0 ];
			const x1 = uvBuffer[ i + 2 ];
			const x2 = uvBuffer[ i + 4 ];

			const max = Math.max( x0, x1, x2 );
			const min = Math.min( x0, x1, x2 );

			// 0.9 is somewhat arbitrary

			if ( max > 0.9 && min < 0.1 ) {

				if ( x0 < 0.2 ) uvBuffer[ i + 0 ] += 1;
				if ( x1 < 0.2 ) uvBuffer[ i + 2 ] += 1;
				if ( x2 < 0.2 ) uvBuffer[ i + 4 ] += 1;

			}

		}

	}

	function pushVertex( vertex ) {
        // Map to circle
        vertex.normalize().multiplyScalar( radius );

		vertexBuffer.push( vertex.x, vertex.y, vertex.z );
        hash_vertex(vertex);
    }

    function hash_vertex(vertex){
        var key = vertex.x.toString()+vertex.y.toString()+vertex.z.toString();
        var idx = vertexBuffer.length-1;
        if(key in points){
            points[key].count++;
            points[key].indicies.push(idx);
        }else{
            points[key] = {
                pos: vertex,
                count: 1,
                key: key,
                indicies: [idx],
                elevation: null,
                connections: []
            }
        }
        return points[key];
    }
 
	function getVertexByIndex( index, vertex ) {

		const stride = index * 3;

		vertex.x = vertices[ stride + 0 ];
		vertex.y = vertices[ stride + 1 ];
		vertex.z = vertices[ stride + 2 ];

	}

	function correctUVs() {

		const a = new THREE.Vector3();
		const b = new THREE.Vector3();
		const c = new THREE.Vector3();

		const centroid = new THREE.Vector3();

		const uvA = new THREE.Vector2();
		const uvB = new THREE.Vector2();
		const uvC = new THREE.Vector2();

		for ( let i = 0, j = 0; i < vertexBuffer.length; i += 9, j += 6 ) {

			a.set( vertexBuffer[ i + 0 ], vertexBuffer[ i + 1 ], vertexBuffer[ i + 2 ] );
			b.set( vertexBuffer[ i + 3 ], vertexBuffer[ i + 4 ], vertexBuffer[ i + 5 ] );
			c.set( vertexBuffer[ i + 6 ], vertexBuffer[ i + 7 ], vertexBuffer[ i + 8 ] );

			uvA.set( uvBuffer[ j + 0 ], uvBuffer[ j + 1 ] );
			uvB.set( uvBuffer[ j + 2 ], uvBuffer[ j + 3 ] );
			uvC.set( uvBuffer[ j + 4 ], uvBuffer[ j + 5 ] );

			centroid.copy( a ).add( b ).add( c ).divideScalar( 3 );

			const azi = azimuth( centroid );

			correctUV( uvA, j + 0, a, azi );
			correctUV( uvB, j + 2, b, azi );
			correctUV( uvC, j + 4, c, azi );

		}

	}

	function correctUV( uv, stride, vector, azimuth ) {

		if ( ( azimuth < 0 ) && ( uv.x === 1 ) ) {
			uvBuffer[ stride ] = uv.x - 1;
		}

		if ( ( vector.x === 0 ) && ( vector.z === 0 ) ) {
			uvBuffer[ stride ] = azimuth / 2 / Math.PI + 0.5;
		}
	}
	// Angle around the Y axis, counter-clockwise when looking from above.

	function azimuth( vector ) {
		return Math.atan2( vector.z, - vector.x );
	}

	// Angle above the XZ plane.
	function inclination( vector ) {
		return Math.atan2( - vector.y, Math.sqrt( ( vector.x * vector.x ) + ( vector.z * vector.z ) ) );
	}
}

PlanetBufferGeometry.prototype = Object.create( THREE.PolyhedronBufferGeometry.prototype );
PlanetBufferGeometry.prototype.constructor = PlanetBufferGeometry;