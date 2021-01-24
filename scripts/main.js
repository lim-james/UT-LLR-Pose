const Patches = require('Patches');
const Scene = require('Scene');
const FaceTracking = require('FaceTracking');
const Reactive = require('Reactive');
const Diagnostics = require('Diagnostics');

const FRAME_DELAY = 1;

(async () => {

    // await Patches.inputs.setPulse('onMatch', TouchGestures.onTap());
    const poseIndex = await Patches.outputs.getScalar('poseIndex');
    const et = await Patches.outputs.getScalar('et');

    // game state
    var isRecording = false;

    const setIsWaiting = state => Patches.inputs.setBoolean('isWaiting', state);
    setIsWaiting(true);

    const subscribeDoneCallback = name => {
        Patches.outputs.getPulse(name + 'Done').then(
            patch => patch.subscribe(() => setIsWaiting(true))
        );
    };

    subscribeDoneCallback('ingot');
    subscribeDoneCallback('cow');
    subscribeDoneCallback('swoosh');

    Patches.outputs.getPulse('onRecordingStart').then(
        pulse => pulse.subscribe(() => isRecording = true)
    );

    Patches.outputs.getPulse('onRecordingEnd').then(
        pulse => pulse.subscribe(() => isRecording = false)
    );

    // get all pose states
    const inPose = await Promise.all([
        Patches.outputs.getBoolean('inPose0'),
        Patches.outputs.getBoolean('inPose1'),
        Patches.outputs.getBoolean('inPose2'),
    ]);

    // bounce time for detection
    let bt = -1;

    const facePosition = await FaceTracking.face(0).cameraTransform.position;
    // project face onto screen
    Patches.inputs.setPoint2D('faceScreenPosition', Scene.projectToScreen(facePosition));
    // face position callback
    facePosition.x.monitor().subscribe(event => {
        if (!isRecording) return;

        const index = poseIndex.pinLastValue();
        if (inPose[index].pinLastValue()) {
            Patches.inputs.setBoolean('inPose', true);

            if (bt < 0) {
                bt = et.pinLastValue();
            } else if (et.pinLastValue() - bt > FRAME_DELAY) {
                setIsWaiting(false);
                Patches.inputs.setPulse('onMatch', Reactive.once());
                Patches.inputs.setPulse('trigger_' + index, Reactive.once());
                bt = -1;
            }
        } else {
            Patches.inputs.setBoolean('inPose', false);
            bt = -1;
        }
    });
})();