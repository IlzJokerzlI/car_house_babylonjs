/// By; Arvin Lee (2301956134) @ 3 November 2021 [v1.0]

import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, Vector3, HemisphericLight, MeshBuilder, Color3, FreeCamera, ActionManager, ExecuteCodeAction, SceneLoader, Camera, Light, Animation } from "@babylonjs/core";
import "@babylonjs/loaders/OBJ"

class App {
    // General Entire Application
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _hasCarMoved = false;
    private _delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms)); // Delay

    // Scene - related
    private _state: number = 0;

    // Create canvas
    private _createCanvas(): HTMLCanvasElement {
        var canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "canvas1";
        document.body.append(canvas); // Add the canvas into the HTML body
        return canvas
    }

    // Create scene
    private _createScene(canvas: HTMLCanvasElement, engine: Engine): Scene {
        const scene = new Scene(engine);

        // Create round
        const ground = MeshBuilder.CreateGround('ground', { height: 301, width: 100 }, scene);

        // Set up camera 1
        const camera1 = function(): Camera {
            const camera = new FreeCamera('camera1', new Vector3(100, 150, -170), scene);
            camera.setTarget(Vector3.Zero());
            camera.attachControl(canvas, false);

            /// Uncomment this to enable camera movement
            // camera.keysUp.push(87);
            // camera.keysDown.push(83);
            // camera.keysLeft.push(65);
            // camera.keysRight.push(68);
            return camera;
        }();
        var camera2: Camera;

        // Set up light
        const light = function(): Light {
            const light = new HemisphericLight('hemilight', new Vector3(0, 100, 0), scene);
            light.diffuse = new Color3(1, 1, 1);

            // Action to turn of the light - spacebar
            scene.actionManager = new ActionManager(scene);
            scene.actionManager.registerAction(
                new ExecuteCodeAction({ trigger: ActionManager.OnKeyUpTrigger, parameter: ' ' }, function() {
                    light.setEnabled(!light.isEnabled());
                }),
            );
            return light;
        }();

        // Load house object
        SceneLoader.LoadAssetContainer('./assets/house/', 'house.obj', scene, function(container) {
            container.meshes.forEach((value, index) => {
                value.position = new Vector3(0, 0, 100);
                value.scaling = new Vector3(0.1, 0.1, 0.1);
            })
            container.addAllToScene();
        });

        // Load car object
        SceneLoader.LoadAssetContainer('./assets/car/', 'copy-of-lamborghini-aventador.obj', scene, (container) => {
            const seatMesh = container.meshes.filter((value) => value.name === 'mesh_mm2')[0]; // Filter out "mesh_mm2", which is the interior chair
            container.meshes.forEach((value) => {
                if (value != seatMesh) {
                    /// Set up the parent of each meshes to the interior chair. By doing so, the meshes is unified. Thus chaning position or scale of the parent is sufficient to change the child meshes, reducing boilerplate.
                    value.parent = seatMesh;
                }

                /// Set action to every mashes. When tapped, it will change the camera viewpoint into the car and get the car moving forward.
                value.actionManager = new ActionManager(scene);
                value.actionManager.registerAction(
                    new ExecuteCodeAction(ActionManager.OnPickTrigger, async (meshEvent) => {
                        if (!this._hasCarMoved) {
                            await this._delay(500); // A short delay
                            this._hasCarMoved = true; // Update car status, so it won't be repeated

                            // Change camera to camera2 (inside the car)
                            camera1.detachControl();
                            camera2 = new FreeCamera('camera2', new Vector3(1.5, 4.5, -100), scene);
                            camera2.attachControl(canvas, false);
                            scene.activeCamera = camera2;

                            // Animations for moving both car and camera
                            Animation.CreateAndStartAnimation('movecar', seatMesh, 'position', 30, 100, seatMesh.position, seatMesh.position.add(new Vector3(0, 0, 150)), Animation.ANIMATIONLOOPMODE_CONSTANT);
                            Animation.CreateAndStartAnimation('movecamera', camera2, 'position', 30, 100, camera2.position, camera2.position.add(new Vector3(0, 0, 150)), Animation.ANIMATIONLOOPMODE_CONSTANT, null, async () => {
                                /// After the car has moved to the desired destination. The car will be stopped and the camera will be switched back to camera1 (view from top).
                                await this._delay(500); // A short delay

                                // Change camera back to camera1 with newly updated position
                                camera2.detachControl();
                                camera1.position = new Vector3(25, 50, 0);
                                camera1.attachControl(canvas, false);
                                scene.activeCamera = camera1;
                            });

                        }
                    })
                );
            })
            // Set position, scale, and rotation of the meshes
            seatMesh.position = new Vector3(0, 0, -100);
            seatMesh.scaling = new Vector3(4, 4, 4);
            seatMesh.rotation = new Vector3(0, 1.55, 0);
            container.addAllToScene();
        });
        return scene;

    }

    // Constructor
    constructor() {
        // Create canvas
        this._canvas = this._createCanvas();

        // Init babylon scene and engine
        this._engine = new Engine(this._canvas, true);
        this._scene = this._createScene(this._canvas, this._engine);

        // Hide/show the Inspector
        window.addEventListener("keydown", (ev) => {
            // Ctrl+Alt+Shift+I
            if (ev.ctrlKey && ev.altKey && ev.shiftKey && ev.key === 'I') {
                if (this._scene.debugLayer.isVisible()) {
                    this._scene.debugLayer.hide();
                } else {
                    this._scene.debugLayer.show();
                }
            }
        });

        // Run the main render loop
        this._engine.runRenderLoop(() => {
            this._scene.render();
        });
    }
}

// Entry point
new App();