export type InstanceId = string;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type PropertyValue = string | number | boolean | Vec3;

export interface RbxInstance {
  id: InstanceId;
  className: string;
  name: string;
  parent: InstanceId | null;
  children: InstanceId[];
  properties: Record<string, PropertyValue>;
  source?: string;
}

export interface Project {
  id: string;
  name: string;
  template: string;
  createdAt: number;
  updatedAt: number;
  rootId: InstanceId;
  instances: Record<InstanceId, RbxInstance>;
}

export interface ProjectMeta {
  id: string;
  name: string;
  template: string;
  createdAt: number;
  updatedAt: number;
  instanceCount: number;
}

export type ToolMode = 'select' | 'move' | 'rotate' | 'scale';

export interface TransformPayload {
  position?: Vec3;
  orientation?: Vec3;
  size?: Vec3;
}
