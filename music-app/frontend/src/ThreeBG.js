import React, { useRef, useEffect } from "react";
import * as THREE from "three";

export default function ThreeBG() {
  const mountRef = useRef();

  useEffect(() => {
    let width = window.innerWidth;
    let height = window.innerHeight;
    let frameId;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 16;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height);

    // Add floating glowing spheres
    const shapes = [];
    for (let i = 0; i < 7; i++) {
      const color = new THREE.Color(`hsl(${180 + i * 30}, 80%, 60%)`);
      const geometry = new THREE.SphereGeometry(1.1 + Math.random() * 0.7, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.7 + Math.random() * 0.5,
        transparent: true,
        opacity: 0.7,
        roughness: 0.3,
        metalness: 0.7,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );
      mesh.userData = {
        speed: 0.2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
      };
      scene.add(mesh);
      shapes.push(mesh);
    }

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xa78bfa, 1.2);
    dirLight.position.set(0, 8, 12);
    scene.add(dirLight);

    // Animation loop
    const animate = (time) => {
      for (let i = 0; i < shapes.length; i++) {
        const mesh = shapes[i];
        mesh.position.y += Math.sin(time * 0.0005 + mesh.userData.phase) * mesh.userData.speed * 0.02;
        mesh.position.x += Math.cos(time * 0.0003 + mesh.userData.phase) * mesh.userData.speed * 0.01;
        mesh.rotation.y += 0.002 * mesh.userData.speed;
        mesh.rotation.x += 0.001 * mesh.userData.speed;
      }
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    // Handle resize
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    // Mount renderer
    mountRef.current.appendChild(renderer.domElement);
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      if (mountRef.current && renderer.domElement && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
} 