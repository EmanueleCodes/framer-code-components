import { create } from "zustand";

interface SceneState {
    animate: boolean;
    autoRotate: boolean;
    backgroundColor: string;
    landColor: string;
    waterColor: string;
    blendFactor: number;
    scaleFactor: number;
    opacity: number;
    bloomRadius: number;
    bloomStrength: number;
    bloomThreshold: number;
    lightColor: string;
    lightIntensity: number;
    toneMappingExposure: number;
    showText: boolean;
    showInterface: boolean;
    setAnimate: (animate: boolean) => void;
    setAutoRotate: (autoRotate: boolean) => void;
    setBackgroundColor: (backgroundColor: string) => void;
    setLandColor: (landColor: string) => void;
    setWaterColor: (waterColor: string) => void;
    setBlendFactor: (blendFactor: number) => void;
    setScaleFactor: (scaleFactor: number) => void;
    setOpacity: (opacity: number) => void;
    setBloomRadius: (bloomRadius: number) => void;
    setBloomStrength: (bloomStrength: number) => void;
    setBloomThreshold: (bloomThreshold: number) => void;
    setLightColor: (lightColor: string) => void;
    setLightIntensity: (lightIntensity: number) => void;
    setToneMappingExposure: (toneMappingExposure: number) => void;
    toggleShowInterface: () => void;
    toggleShowText: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
    animate: true,
    autoRotate: true,
    backgroundColor: "#0d0d0d",
    landColor: "#fff0d1",
    waterColor: "#0d111a",
    blendFactor: 0.96,
    scaleFactor: 0.09,
    opacity: 0.81,
    bloomRadius: 0.48,
    bloomStrength: 0.6,
    bloomThreshold: 0,
    lightColor: "#ffd0b8",
    lightIntensity: 0.9,
    toneMappingExposure: 1,
    showInterface: true,
    showText: true,
    setAnimate: (animate) => set({ animate }),
    setAutoRotate: (autoRotate) => set({ autoRotate }),
    setBackgroundColor: (backgroundColor) => set({ backgroundColor }),
    setLandColor: (landColor) => set({ landColor }),
    setWaterColor: (waterColor) => set({ waterColor }),
    setBlendFactor: (blendFactor) => set({ blendFactor }),
    setScaleFactor: (scaleFactor) => set({ scaleFactor }),
    setOpacity: (opacity) => set({ opacity }),
    setBloomRadius: (bloomRadius) => set({ bloomRadius }),
    setBloomStrength: (bloomStrength) => set({ bloomStrength }),
    setBloomThreshold: (bloomThreshold) => set({ bloomThreshold }),
    setLightColor: (lightColor) => set({ lightColor }),
    setLightIntensity: (lightIntensity) => set({ lightIntensity }),
    setToneMappingExposure: (toneMappingExposure) =>
        set({ toneMappingExposure }),
    toggleShowInterface: () =>
        set((state) => ({
            showInterface: !state.showInterface,
            showText: !state.showInterface
        })),
    toggleShowText: () => set((state) => ({ showText: !state.showText }))
}));
