import test from "node:test";
import assert from "node:assert/strict";
import { musicScene, MUSIC } from "../src/audio";
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
