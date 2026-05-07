export type FeatureGroup = {
  id: string;
  label: string;
  fields: { id: string; label: string; options: string[] }[];
};

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: "structure",
    label: "Face Structure",
    fields: [
      { id: "faceShape", label: "Face Shape", options: ["oval", "round", "square", "diamond", "heart", "long", "rectangular", "triangular"] },
    ],
  },
  {
    id: "skin",
    label: "Skin",
    fields: [
      { id: "skinTone", label: "Skin Tone", options: ["very fair", "fair", "light", "medium", "olive", "tan", "brown", "dark brown", "deep"] },
      { id: "skinTexture", label: "Skin Texture", options: ["smooth", "rough", "weathered", "wrinkled", "youthful", "pockmarked"] },
      { id: "freckles", label: "Freckles", options: ["none", "light", "moderate", "heavy"] },
      { id: "facialMarks", label: "Facial Marks", options: ["none", "mole left cheek", "mole right cheek", "birthmark forehead", "scar above brow"] },
    ],
  },
  {
    id: "eyes",
    label: "Eyes",
    fields: [
      { id: "eyeShape", label: "Eye Shape", options: ["almond", "round", "hooded", "monolid", "downturned", "upturned", "deep-set", "protruding"] },
      { id: "eyeSize", label: "Eye Size", options: ["small", "medium", "large"] },
      { id: "eyeColor", label: "Eye Color", options: ["brown", "hazel", "green", "blue", "grey", "amber", "black"] },
      { id: "eyeSpacing", label: "Eye Spacing", options: ["close-set", "average", "wide-set"] },
      { id: "eyelashes", label: "Eyelashes", options: ["sparse", "medium", "thick", "long"] },
      { id: "eyeAngle", label: "Eye Angle", options: ["neutral", "slight upward", "slight downward"] },
    ],
  },
  {
    id: "brows",
    label: "Eyebrows",
    fields: [
      { id: "browThickness", label: "Thickness", options: ["thin", "medium", "thick", "bushy"] },
      { id: "browCurve", label: "Curve", options: ["straight", "soft arch", "high arch", "rounded"] },
      { id: "browSpacing", label: "Spacing", options: ["close", "normal", "wide"] },
    ],
  },
  {
    id: "nose",
    label: "Nose",
    fields: [
      { id: "noseWidth", label: "Width", options: ["narrow", "medium", "wide"] },
      { id: "noseLength", label: "Length", options: ["short", "medium", "long"] },
      { id: "noseBridge", label: "Bridge", options: ["straight", "roman", "concave", "crooked"] },
      { id: "noseTip", label: "Tip Style", options: ["pointed", "rounded", "upturned", "downturned", "bulbous"] },
    ],
  },
  {
    id: "lips",
    label: "Lips",
    fields: [
      { id: "lipThickness", label: "Thickness", options: ["thin", "medium", "full", "very full"] },
      { id: "lipWidth", label: "Width", options: ["narrow", "medium", "wide"] },
      { id: "lipShape", label: "Shape", options: ["bow-shaped", "heart", "round", "straight", "downturned"] },
    ],
  },
  {
    id: "hair",
    label: "Hair",
    fields: [
      { id: "hairStyle", label: "Style", options: ["buzz cut", "short side-part", "messy", "slicked-back", "afro", "ponytail", "bun", "long loose", "braided", "mohawk", "bald"] },
      { id: "hairLength", label: "Length", options: ["bald", "very short", "short", "medium", "long", "very long"] },
      { id: "hairTexture", label: "Texture", options: ["straight", "wavy", "curly", "coily", "kinky"] },
      { id: "hairColor", label: "Color", options: ["black", "dark brown", "brown", "blonde", "red", "grey", "white", "dyed blue", "dyed pink"] },
      { id: "hairline", label: "Hairline", options: ["straight", "widow's peak", "receding", "high", "low"] },
    ],
  },
  {
    id: "facialHair",
    label: "Facial Hair",
    fields: [
      { id: "beardStyle", label: "Beard Style", options: ["none", "stubble", "goatee", "full beard", "van dyke", "mutton chops", "circle beard"] },
      { id: "beardDensity", label: "Beard Density", options: ["none", "light", "medium", "thick"] },
      { id: "mustache", label: "Mustache", options: ["none", "thin", "thick", "handlebar", "horseshoe", "pencil"] },
    ],
  },
  {
    id: "jaw",
    label: "Jaw & Chin",
    fields: [
      { id: "jawSharpness", label: "Jaw Sharpness", options: ["soft", "rounded", "defined", "sharp", "angular"] },
      { id: "chinSize", label: "Chin Size", options: ["small", "medium", "large", "prominent"] },
      { id: "chinShape", label: "Chin Shape", options: ["pointed", "rounded", "square", "cleft"] },
    ],
  },
  {
    id: "ears",
    label: "Ears",
    fields: [
      { id: "earSize", label: "Ear Size", options: ["small", "medium", "large"] },
      { id: "earAngle", label: "Ear Angle", options: ["flat", "slightly protruding", "protruding"] },
    ],
  },
  {
    id: "extras",
    label: "Extras",
    fields: [
      { id: "glasses", label: "Glasses", options: ["none", "round", "square", "aviator", "rimless", "thick-rimmed", "sunglasses"] },
      { id: "scars", label: "Scars", options: ["none", "left cheek scar", "right cheek scar", "forehead scar", "lip scar", "chin scar"] },
      { id: "tattoos", label: "Tattoos", options: ["none", "neck tattoo", "face teardrop", "small temple tattoo"] },
      { id: "expression", label: "Expression", options: ["neutral", "stern", "angry", "smirking", "calm", "suspicious", "fearful"] },
      { id: "age", label: "Age", options: ["teen", "20s", "30s", "40s", "50s", "60s", "70s+"] },
      { id: "gender", label: "Gender", options: ["male", "female", "androgynous"] },
    ],
  },
];

export const DEFAULTS: Record<string, string> = (() => {
  const d: Record<string, string> = {};
  FEATURE_GROUPS.forEach((g) => g.fields.forEach((f) => (d[f.id] = f.options[0])));
  d.gender = "male";
  d.age = "30s";
  d.expression = "neutral";
  return d;
})();

export function buildPrompt(features: Record<string, string>, mode: "sketch" | "realistic", style: "grayscale" | "semi-real") {
  const lines = [
    `Subject: ${features.gender}, age ${features.age}, expression ${features.expression}.`,
    `Face: ${features.faceShape} shape, ${features.jawSharpness} jaw, ${features.chinShape} ${features.chinSize} chin.`,
    `Skin: ${features.skinTone} tone, ${features.skinTexture}, ${features.freckles} freckles, ${features.facialMarks}.`,
    `Eyes: ${features.eyeSize} ${features.eyeShape} ${features.eyeColor} eyes, ${features.eyeSpacing}, ${features.eyelashes} lashes, ${features.eyeAngle} angle.`,
    `Eyebrows: ${features.browThickness} ${features.browCurve} brows, ${features.browSpacing} spacing.`,
    `Nose: ${features.noseWidth} ${features.noseLength} nose, ${features.noseBridge} bridge, ${features.noseTip} tip.`,
    `Lips: ${features.lipThickness} ${features.lipWidth} ${features.lipShape} lips.`,
    `Hair: ${features.hairStyle}, ${features.hairLength}, ${features.hairTexture}, ${features.hairColor}, ${features.hairline} hairline.`,
    `Facial hair: ${features.beardStyle} (${features.beardDensity}), mustache ${features.mustache}.`,
    `Ears: ${features.earSize}, ${features.earAngle}.`,
    `Accessories: glasses ${features.glasses}, scars ${features.scars}, tattoos ${features.tattoos}.`,
  ];
  const styleLine =
    mode === "realistic"
      ? "Hyper-realistic photographic forensic portrait, neutral studio lighting, sharp focus, plain dark background, head and shoulders, looking straight at camera."
      : style === "grayscale"
        ? "Black-and-white police forensic pencil sketch on white paper, hand-drawn graphite shading, high detail, head and shoulders, plain background."
        : "Semi-realistic forensic composite portrait, soft color shading over sketch lines, head and shoulders, plain neutral background.";
  return `${styleLine}\n\nSuspect description:\n${lines.join("\n")}`;
}
