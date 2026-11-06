import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { passenger, disposePassenger } from '../src/passenger.js';

test('departing passengers dispose each owned resource once without touching other passengers', () => {
  const scene = new THREE.Scene();
  const departing = passenger(scene, 1);
  const remaining = passenger(scene, 2);
  const resources = new Set();
  departing.traverse(node => {
    if (node.geometry) resources.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) resources.add(material);
  });
  const texture = new THREE.Texture();
  departing.userData.coat.map = texture;
  resources.add(texture);
  const disposed = new Map([...resources].map(resource => [resource, 0]));
  for (const resource of resources) resource.addEventListener('dispose', () => disposed.set(resource, disposed.get(resource) + 1));
  let otherDisposals = 0;
  remaining.traverse(node => node.geometry?.addEventListener('dispose', () => otherDisposals++));
  disposePassenger(departing);
  disposePassenger(departing);
  assert.ok([...disposed.values()].every(count => count === 1));
  assert.equal(otherDisposals, 0);
  assert.equal(departing.parent, null);
  assert.equal(departing.children.length, 0);
  assert.equal(remaining.parent, scene);
});

test('shared Three.js sprite geometry survives another passenger leaving', () => {
  const scene = new THREE.Scene();
  const departing = passenger(scene, 1);
  const remaining = passenger(scene, 2);
  const first = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.Texture() }));
  const second = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.Texture() }));
  departing.add(first); remaining.add(second);
  assert.equal(first.geometry, second.geometry, 'Three.js supplies shared Sprite geometry');
  let sharedDisposals = 0;
  const count = () => sharedDisposals++;
  second.geometry.addEventListener('dispose', count);
  try {
    disposePassenger(departing);
    assert.equal(sharedDisposals, 0);
    assert.equal(second.parent, remaining);
  } finally { second.geometry.removeEventListener('dispose', count); }
});
