import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {intentFromText,groundedLook} from '../lib/styling-engine.mjs';
const source=readFileSync(new URL('../catalog-experience.js',import.meta.url),'utf8');
const build=vm.runInNewContext('('+source.match(/function buildOutfitQuery[^\n]+/)[0]+')');
test('all occasion/style combinations request a complete outfit and retain optional constraints',()=>{
 for(const occasion of ['Everyday','Work','Dinner','Special event'])for(const style of ['Casual','Business casual','Dressy','Help me choose']){
  const query=build(occasion,style,'No red, relaxed fit, black sneakers, under $90');
  assert.ok(query.includes(occasion));assert.ok(query.includes(style));assert.ok(query.includes('No red, relaxed fit, black sneakers, under $90'));
  const intent=intentFromText(query,{budget:120});assert.equal(intent.outfit,true);assert.equal(intent.budget,90);assert.deepEqual(intent.excludedColors,['red']);
 }
 assert.ok(build('Special event','Business casual','x'.repeat(350)).length<=500);
});
test('outfit selection cannot advertise a complete outfit above the total merchandise budget',()=>{
 const products=['shirt','pants','shoes'].map((slot,i)=>({id:String(i),slot,price:45,currency:'USD',title:slot}));
 const look=groundedLook(products,intentFromText(build('Work','Business casual',''),{budget:100}));
 assert.ok(look.total<=100);assert.equal(look.complete,false);
});
