import test from "node:test";
import assert from "node:assert/strict";
import { musicScene, MUSIC, GameAudio } from "../src/audio";
test("daily completion celebrates, failures retain sad music", () => {
 const state = {ended:true,mode:"daily" as const,time:300,danger:0,fever:10};
 assert.equal(musicScene(state),"clear");
 assert.equal(musicScene({...state,danger:100}),"sad");
 assert.equal(musicScene({...state,time:299}),"sad");
 assert.equal(musicScene({...state,mode:"survival"}),"sad");
 assert.equal(musicScene({...state,mode:"endless"}),"sad");
 assert.equal(musicScene({...state,ended:false}),"fever");
 assert.equal(musicScene({...state,ended:false,fever:0}),"normal");
 assert.ok(MUSIC.clear.bpm > MUSIC.sad.bpm);
});

test("fission chimes coalesce bursts and respect mute, pause and music scene", () => {
  const audio = new GameAudio();
  const state = audio as unknown as {ctx: {state:string,currentTime:number}; active:boolean; scene:string; tone: (...args:unknown[])=>void};
  state.ctx = {state:"running",currentTime:1};
  state.active = true; state.scene = "fever";
  let tones = 0; state.tone = () => { tones++; };
  audio.feverFission(0); assert.equal(tones,0);
  audio.feverFission(100); assert.equal(tones,2);
  state.ctx.currentTime = 1.1; audio.feverFission(100); assert.equal(tones,2);
  state.ctx.currentTime = 1.125; audio.feverFission(1); assert.equal(tones,4);
  state.ctx.currentTime = 2; audio.muted = true; audio.feverFission(1); assert.equal(tones,4);
  audio.muted = false; state.active = false; audio.feverFission(1); assert.equal(tones,4);
  state.active = true; state.scene = "normal"; audio.feverFission(1); assert.equal(tones,4);
});
