"use client"

import { useState, useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, TransformControls } from '@react-three/drei'
import * as THREE from 'three'
// Importa el tipo TransformControls de three.js


const initialColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']

// Límites de movimiento para los cubos
const POSITION_LIMITS = {
  x: { min: -5, max: 5 },
  y: { min: 0, max: 5 },
  z: { min: -5, max: 5 },
}

// Función para limitar un valor dentro de un rango
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

// Componente Cube
function Cube({ 
  position, 
  color, 
  index, 
  debugMode, 
  isSelected, 
  onSelect, 
  dimensions, 
  setDimensions 
}: {
  position: [number, number, number],
  color: string,
  index: number,
  debugMode: boolean,
  isSelected: boolean,
  onSelect: (index: number) => void,
  dimensions: any,
  setDimensions: (index: number, newDimensions: any) => void
}) {
  const mesh = useRef<THREE.Mesh>(null)
  const transform = useRef<any>(null)


  // Actualiza la escala del cubo cuando cambian las dimensiones
  useEffect(() => {
    if (mesh.current) {
      mesh.current.scale.set(dimensions.width, dimensions.height, dimensions.depth)
    }
  }, [dimensions])

  // Maneja el cambio de transformación al finalizar
  const handleDragEnd = () => {
    if (mesh.current) {
      const newPosition = mesh.current.position.toArray().map((coord, i) => 
        clamp(coord, Object.values(POSITION_LIMITS)[i].min, Object.values(POSITION_LIMITS)[i].max)
      ) as [number, number, number]

      // Verifica si la posición realmente ha cambiado antes de actualizar el estado
      const hasChanged = newPosition.some((coord, i) => coord !== dimensions.position[i])
      if (hasChanged) {
        mesh.current.position.set(...newPosition)
        setDimensions(index, { ...dimensions, position: newPosition })
      }
    }
  }

  return (
    <>
      {debugMode && isSelected ? (
        <TransformControls 
          ref={transform} 
          object={mesh} 
          mode="translate" 
          onDragEnd={handleDragEnd} // Usar onDragEnd en lugar de onChange
          translationSnap={0.1} // Ajusta la sensibilidad del movimiento
        >
          <mesh
            position={position}
            ref={mesh}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(index)
            }}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </TransformControls>
      ) : (
        <mesh
          position={position}
          ref={mesh}
          onClick={(e) => {
            e.stopPropagation()
            if (debugMode) {
              onSelect(index)
            } else {
              setDimensions(index, { 
                ...dimensions, 
                color: initialColors[Math.floor(Math.random() * initialColors.length)] 
              })
            }
          }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )}
    </>
  )
}

// Componente Base (tablero)
function Base() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial color="#cccccc" />
    </mesh>
  )
}

// Componente Scene
function Scene({ 
  debugMode, 
  selectedCube, 
  setSelectedCube, 
  cubeDimensions, 
  setCubeDimensions, 
  rotationLocked 
}: {
  debugMode: boolean,
  selectedCube: number | null,
  setSelectedCube: (index: number | null) => void,
  cubeDimensions: any[],
  setCubeDimensions: (newDimensions: any[]) => void,
  rotationLocked: boolean
}) {
  const { scene } = useThree()
  const orbitControlsRef = useRef<OrbitControls>(null)

  // Añade o remueve el AxesHelper según el modo Debug
  useEffect(() => {
    const axes = new THREE.AxesHelper(5)
    if (debugMode) {
      scene.add(axes)
    } else {
      scene.remove(axes)
    }
    return () => scene.remove(axes)
  }, [debugMode, scene])

  // Controla la rotación del OrbitControls
  useEffect(() => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enableRotate = !rotationLocked
    }
  }, [rotationLocked])

  // Maneja la selección de cubo
  const handleSelectCube = (index: number) => {
    setSelectedCube(index)
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      {cubeDimensions.map((dimensions, index) => (
        <Cube
          key={index}
          position={dimensions.position}
          color={dimensions.color}
          index={index}
          debugMode={debugMode}
          isSelected={selectedCube === index}
          onSelect={handleSelectCube}
          dimensions={dimensions}
          setDimensions={(idx, newDimensions) => {
            const newDims = [...cubeDimensions]
            newDims[idx] = newDimensions
            setCubeDimensions(newDims)
          }}
        />
      ))}
      <Base />
      <OrbitControls ref={orbitControlsRef} enablePan={true} enableZoom={true} enableRotate={!rotationLocked} />
    </>
  )
}

// Componente Principal CubesEditor
export default function CubesEditor() {
  const [debugMode, setDebugMode] = useState(false)
  const [selectedCube, setSelectedCube] = useState<number | null>(null)
  const [cubeDimensions, setCubeDimensions] = useState<any[]>(
    initialColors.map((color, index) => ({
      width: 1,
      height: 1,
      depth: 1,
      color,
      position: [
        (index % 3) * 2 - 2,
        0.5,
        Math.floor(index / 3) * 2 - 1
      ] as [number, number, number]
    }))
  )
  const [editDimensions, setEditDimensions] = useState<{ width: number, height: number, depth: number, color: string, position: [number, number, number] }>({
    width: 1,
    height: 1,
    depth: 1,
    color: '#ffffff',
    position: [0, 0, 0]
  })
  const [rotationLocked, setRotationLocked] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  // Actualiza las dimensiones de edición cuando se selecciona un cubo
  useEffect(() => {
    if (selectedCube !== null) {
      setEditDimensions(cubeDimensions[selectedCube])
    }
  }, [selectedCube, cubeDimensions])

  // Maneja el bloqueo/desbloqueo de rotación con la tecla Espacio
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault()
        setRotationLocked(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Aplica las dimensiones editadas al cubo seleccionado
  const handleApplyDimensions = () => {
    if (selectedCube !== null) {
      const newDims = [...cubeDimensions]
      newDims[selectedCube] = { ...editDimensions }
      setCubeDimensions(newDims)
    }
  }

  // Guarda el proyecto actual en un archivo JSON
  const handleSaveProject = () => {
    const projectData = JSON.stringify(cubeDimensions, null, 2)
    const blob = new Blob([projectData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'cube_project.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Añade un nuevo cubo con valores predeterminados dentro de los límites
  const handleAddCube = () => {
    const newCube = {
      width: 1,
      height: 1,
      depth: 1,
      color: initialColors[Math.floor(Math.random() * initialColors.length)],
      position: [
        clamp(Math.random() * (POSITION_LIMITS.x.max - POSITION_LIMITS.x.min) + POSITION_LIMITS.x.min, POSITION_LIMITS.x.min, POSITION_LIMITS.x.max),
        clamp(0.5, POSITION_LIMITS.y.min, POSITION_LIMITS.y.max),
        clamp(Math.random() * (POSITION_LIMITS.z.max - POSITION_LIMITS.z.min) + POSITION_LIMITS.z.min, POSITION_LIMITS.z.min, POSITION_LIMITS.z.max)
      ] as [number, number, number]
    }
    setCubeDimensions(prev => [...prev, newCube])
  }

  // Elimina el cubo seleccionado
  const handleDeleteCube = () => {
    if (selectedCube !== null) {
      const newDims = cubeDimensions.filter((_, idx) => idx !== selectedCube)
      setCubeDimensions(newDims)
      setSelectedCube(null)
    }
  }

  return (
    <div className="w-full h-screen relative bg-gray-900">
      <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
        <Scene 
          debugMode={debugMode} 
          selectedCube={selectedCube} 
          setSelectedCube={setSelectedCube}
          cubeDimensions={cubeDimensions}
          setCubeDimensions={setCubeDimensions}
          rotationLocked={rotationLocked}
        />
      </Canvas>
      
      {/* Controles de la interfaz */}
      <div className="absolute top-4 left-4 space-y-4">
        {/* Modo Debug */}
        <label className="flex items-center space-x-2 text-white bg-gray-800 px-3 py-2 rounded-md">
          <input
            type="checkbox"
            checked={debugMode}
            onChange={(e) => {
              setDebugMode(e.target.checked)
              if (!e.target.checked) setSelectedCube(null)
            }}
            className="form-checkbox h-5 w-5 text-blue-600"
          />
          <span>Modo Debug</span>
        </label>

        {/* Botón Añadir Cubo */}
        <button
          onClick={handleAddCube}
          className="bg-purple-500 text-white px-3 py-2 rounded hover:bg-purple-600 transition-colors"
        >
          Añadir Cubo
        </button>

        {/* Botón Eliminar Cubo */}
        {debugMode && selectedCube !== null && (
          <button
            onClick={handleDeleteCube}
            className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 transition-colors"
          >
            Eliminar Cubo
          </button>
        )}

        {/* Panel de Edición de Cubo */}
        {debugMode && selectedCube !== null && (
          <div className="bg-gray-800 p-3 rounded-md text-white space-y-2">
            <p>Editar cubo {selectedCube + 1}:</p>
            <div className="space-y-1">
              <label className="flex items-center">
                Ancho:
                <input
                  type="number"
                  value={editDimensions.width === undefined || isNaN(editDimensions.width) ? "" : editDimensions.width}
                  onChange={(e) => setEditDimensions(prev => ({ ...prev, width: parseFloat(e.target.value) || 1 }))}
                  className="ml-2 w-20 text-black px-1"
                />
              </label>
              <label className="flex items-center">
                Alto:
                <input
                  type="number"
                  value={editDimensions.height === undefined || isNaN(editDimensions.height) ? "" : editDimensions.height}
                  onChange={(e) => setEditDimensions(prev => ({ ...prev, height: parseFloat(e.target.value) || 1 }))}
                  className="ml-2 w-20 text-black px-1"
                />
              </label>
              <label className="flex items-center">
                Profundidad:
                <input
                  type="number"
                  value={editDimensions.depth === undefined || isNaN(editDimensions.depth) ? "" : editDimensions.depth}
                  onChange={(e) => setEditDimensions(prev => ({ ...prev, depth: parseFloat(e.target.value) || 1 }))}
                  className="ml-2 w-20 text-black px-1"
                />
              </label>
              <label className="flex items-center">
                Color:
                <input
                  type="color"
                  value={editDimensions.color}
                  onChange={(e) => setEditDimensions(prev => ({ ...prev, color: e.target.value }))}
                  className="ml-2 w-20 h-8"
                />
              </label>
            </div>
            <button
              onClick={handleApplyDimensions}
              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
            >
              Aplicar
            </button>
          </div>
        )}

        {/* Botón Guardar Proyecto */}
        <button
          onClick={handleSaveProject}
          className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 transition-colors"
        >
          Guardar Proyecto
        </button>
      </div>

      {/* Botón para mostrar/ocultar instrucciones */}
      <button
        onClick={() => setShowInstructions(!showInstructions)}
        className="absolute bottom-4 left-4 bg-gray-800 text-white px-3 py-2 rounded-md"
      >
        Info
      </button>

      {/* Instrucciones que se muestran/ocultan */}
      {showInstructions && (
        <div className="absolute bottom-20 left-4 text-white bg-gray-800 px-3 py-2 rounded-md">
          <p>Instrucciones:</p>
          <ul className="list-disc list-inside">
            <li>Activa el modo Debug para interactuar</li>
            <li>Haz clic en un cubo para seleccionarlo</li>
            <li>Edita las dimensiones y el color, luego haz clic en Aplicar</li>
            <li>Arrastra el cubo para moverlo (la posición se guarda al aplicar)</li>
            <li>Desactiva el modo Debug para cambiar colores aleatoriamente</li>
            <li>Presiona ESPACIO para bloquear/desbloquear la rotación de la escena</li>
            <li>Haz clic en "Añadir Cubo" para crear un nuevo cubo</li>
            <li>Haz clic en "Eliminar Cubo" para borrar el cubo seleccionado</li>
            <li>Haz clic en "Guardar Proyecto" para descargar el estado actual</li>
          </ul>
        </div>
      )}

      {/* Indicador de Rotación Bloqueada/Desbloqueada */}
      <div className={`absolute top-4 right-4 px-3 py-2 rounded-md ${rotationLocked ? 'bg-red-500' : 'bg-green-500'}`}>
        Rotación: {rotationLocked ? 'Bloqueada' : 'Desbloqueada'}
      </div>
    </div>
  )
}



