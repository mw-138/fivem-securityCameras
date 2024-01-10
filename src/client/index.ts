import Camera from "@common/camera";
import { Cameras, Keys } from "@common/index";

let cam: number = 0;
let currentCamera: Camera;
let currentCameraIndex: number = 0;
let scaleformTick: number = 0;

const CameraTransitionDuration: number = 250;
const CameraRotateSpeed: number = 0.1;
const EnableRotateClamp: boolean = true;
const RotationEnabled: boolean = true;

setTick(() => {
  InvalidateIdleCam();
});

on("onClientResourceStart", (name: string) => {
  if (name != GetCurrentResourceName()) return;

  // stopUsingCamera();
  useCamera(0);
});

on("onClientResourceStopped", (name: string) => {
  if (name != GetCurrentResourceName()) return;

  stopUsingCamera();
});

setTick(() => {
  Cameras.forEach((camera) => {
    const [x, y, z] = camera.coords;
    DrawMarker(
      28,
      x,
      y,
      z,
      0,
      0,
      0,
      0,
      0,
      0,
      0.01,
      0.01,
      0.01,
      255,
      0,
      0,
      255,
      false,
      true,
      2,
      false,
      null,
      null,
      false
    );
  });
});

function useCamera(index: number): void {
  if (index > Cameras.length - 1 || index < 0) {
    return;
  }
  stopUsingCamera();
  currentCamera = Cameras[index];
  currentCameraIndex = index;
  toggleCameraView(true);
  FreezeEntityPosition(PlayerPedId(), true);
}

function useNextCamera(): void {
  useCamera((currentCameraIndex + 1) % Cameras.length);
}

function usePreviousCamera(): void {
  useCamera((currentCameraIndex - 1 + Cameras.length) % Cameras.length);
}

function stopUsingCamera(): void {
  toggleCameraView(false);
  FreezeEntityPosition(PlayerPedId(), false);
}

function createCamera(): number {
  if (DoesCamExist(cam)) {
    DestroyCam(cam, true);
  }
  return CreateCam("DEFAULT_SCRIPTED_CAMERA", true);
}

async function toggleCameraView(enabled: boolean): Promise<void> {
  if (enabled) {
    cam = createCamera();
    const [x, y, z] = currentCamera.coords;

    await doFadeTransition();

    enableCameraRendering(true);

    SetCamCoord(cam, x, y, z);
    SetCamRot(cam, 0, 0, currentCamera.startingRotation, 2);
    SetTimecycleModifier("scanline_cam_cheap");
    SetTimecycleModifierStrength(2);
    SetFocusArea(x, y, z, 0, 0, 0);

    await renderScaleform();
  } else {
    if (DoesCamExist(cam)) {
      DestroyCam(cam, true);
    }

    clearTick(scaleformTick);
    scaleformTick = 0;

    await doFadeTransition();

    ClearTimecycleModifier();
    ClearFocus();
    enableCameraRendering(false);
  }
}

async function doFadeTransition(): Promise<void> {
  DoScreenFadeOut(CameraTransitionDuration);
  await delay(CameraTransitionDuration * 2);
  DoScreenFadeIn(CameraTransitionDuration);
}

function enableCameraRendering(enabled: boolean): void {
  RenderScriptCams(enabled, false, 1, enabled, enabled);
}

async function renderScaleform(): Promise<void> {
  const handle = RequestScaleformMovie("security_cam");
  while (!HasScaleformMovieLoaded(handle)) {
    await delay(500);
  }

  const [x, y, z] = currentCamera.coords;
  const [streetNameHash, streetCrossHash] = GetStreetNameAtCoord(x, y, z);
  const streetName = GetStreetNameFromHashKey(streetNameHash);
  const streetCross = GetStreetNameFromHashKey(streetCrossHash);

  BeginScaleformMovieMethod(handle, "SET_LOCATION");
  PushScaleformMovieMethodParameterString(`${streetName} - ${streetCross}`);
  EndScaleformMovieMethod();

  BeginScaleformMovieMethod(handle, "SET_DETAILS");
  PushScaleformMovieMethodParameterString(`CAM ${currentCameraIndex + 1}`);
  EndScaleformMovieMethod();

  const instructions = await createInstuctionScaleform();

  scaleformTick = setTick(async () => {
    const hour = GetClockHours();
    const minute = GetClockMinutes();

    BeginScaleformMovieMethod(handle, "SET_TIME");
    PushScaleformMovieMethodParameterInt(hour);
    PushScaleformMovieMethodParameterInt(minute);
    EndScaleformMovieMethod();

    DrawScaleformMovieFullscreen(handle, 255, 255, 255, 255, 0);
    DrawScaleformMovieFullscreen(instructions, 255, 255, 255, 255, 0);

    DisableControlAction(0, Keys.X, true);
    DisableControlAction(0, Keys.LEFT, true);
    DisableControlAction(0, Keys.RIGHT, true);
    DisableControlAction(0, Keys.Q, true);
    DisableControlAction(0, Keys.E, true);

    if (IsDisabledControlJustPressed(0, Keys.X)) {
      stopUsingCamera();
    } else if (IsDisabledControlJustPressed(0, Keys.RIGHT)) {
      useNextCamera();
    } else if (IsDisabledControlJustPressed(0, Keys.LEFT)) {
      usePreviousCamera();
    } else if (RotationEnabled && IsDisabledControlPressed(0, Keys.Q)) {
      rotateCamera(cam, CameraRotateSpeed);
    } else if (RotationEnabled && IsDisabledControlPressed(0, Keys.E)) {
      rotateCamera(cam, -CameraRotateSpeed);
    }
  });
}

function rotateCamera(cam: number, speed: number): void {
  const [x, y, z] = GetCamRot(cam, 2);
  const zRot = z + speed;
  SetCamRot(
    cam,
    0,
    0,
    EnableRotateClamp
      ? clamp(zRot, currentCamera.minClamp, currentCamera.maxClamp)
      : zRot,
    2
  );
  // console.log(Math.ceil(zRot));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function delay(duration: number): Promise<any> {
  return new Promise((res) => setTimeout(res, duration, []));
}

async function createInstuctionScaleform(): Promise<number> {
  const scaleform = RequestScaleformMovie("instructional_buttons");

  while (!HasScaleformMovieLoaded(scaleform)) {
    await delay(0);
  }

  PushScaleformMovieFunction(scaleform, "CLEAR_ALL");
  PopScaleformMovieFunctionVoid();

  PushScaleformMovieFunction(scaleform, "SET_CLEAR_SPACE");
  PushScaleformMovieFunctionParameterInt(200);
  PopScaleformMovieFunctionVoid();

  [
    {
      enabled: true,
      label: "Previous",
      key: Keys.LEFT,
    },
    {
      enabled: true,
      label: "Next",
      key: Keys.RIGHT,
    },
    {
      enabled: RotationEnabled,
      label: "Rotate Left",
      key: Keys.Q,
    },
    {
      enabled: RotationEnabled,
      label: "Rotate Right",
      key: Keys.E,
    },
    {
      enabled: true,
      label: "Close",
      key: Keys.X,
    },
  ]
    .reverse()
    .filter((option) => option.enabled)
    .forEach((input: any, index: number) => {
      PushScaleformMovieFunction(scaleform, "SET_DATA_SLOT");
      PushScaleformMovieFunctionParameterInt(index);
      PushScaleformMovieMethodParameterButtonName(
        GetControlInstructionalButton(0, input.key, true)
      );
      instructionButtonMessage(input.label);
      PopScaleformMovieFunctionVoid();
    });

  PushScaleformMovieFunction(scaleform, "DRAW_INSTRUCTIONAL_BUTTONS");
  PopScaleformMovieFunctionVoid();

  PushScaleformMovieFunction(scaleform, "SET_BACKGROUND_COLOUR");
  PushScaleformMovieFunctionParameterInt(0);
  PushScaleformMovieFunctionParameterInt(0);
  PushScaleformMovieFunctionParameterInt(0);
  PushScaleformMovieFunctionParameterInt(80);
  PopScaleformMovieFunctionVoid();

  return scaleform;
}

function instructionButtonMessage(text: string): void {
  BeginTextCommandScaleformString("STRING");
  AddTextComponentScaleform(text);
  EndTextCommandScaleformString();
}
