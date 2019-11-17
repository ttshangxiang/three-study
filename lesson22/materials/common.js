
export const random = `
vec2 random2(vec2 st){
  return fract(
    sin(
      vec2(
        dot(st, vec2(127.1,311.7)),
        dot(st, vec2(269.5,183.3))
      )
    ) * 43758.5453
  );
}
vec2 random2v(vec2 st){
  return -1.0 + 2.0 * random2(st);
}
vec3 random3(vec3 st) {
  return fract(
    sin(
      vec3(
        dot(st,vec3(127.1,311.7,69.5)),
        dot(st,vec3(269.5,183.3,132.7)), 
        dot(st,vec3(247.3,108.5,96.5))
      )
    ) * 43758.5453
  );
}
vec3 random3v(vec3 st) {
  return -1.0 + 2.0 * random3(st);
}
`
