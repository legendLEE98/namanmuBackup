import { SLIDE_SIZE } from "./schema.mjs";

const EMU_PER_INCH = 914400;
const PX_PER_INCH = 96;
const SLIDE_EMU = {
  width: Math.round((SLIDE_SIZE.width / PX_PER_INCH) * EMU_PER_INCH),
  height: Math.round((SLIDE_SIZE.height / PX_PER_INCH) * EMU_PER_INCH),
};

export function generatePptxBuffer(document) {
  const files = new Map();
  files.set("[Content_Types].xml", contentTypes(document));
  files.set("_rels/.rels", rootRels());
  files.set("docProps/app.xml", appProps(document));
  files.set("docProps/core.xml", coreProps(document));
  files.set("ppt/presentation.xml", presentationXml(document));
  files.set("ppt/_rels/presentation.xml.rels", presentationRels(document));
  files.set("ppt/theme/theme1.xml", themeXml(document));
  files.set("ppt/slideMasters/slideMaster1.xml", slideMasterXml());
  files.set("ppt/slideMasters/_rels/slideMaster1.xml.rels", slideMasterRels());
  files.set("ppt/slideLayouts/slideLayout1.xml", slideLayoutXml());
  files.set("ppt/slideLayouts/_rels/slideLayout1.xml.rels", slideLayoutRels());

  document.slides.forEach((slide, index) => {
    files.set(`ppt/slides/slide${index + 1}.xml`, slideXml(document, slide, index));
    files.set(`ppt/slides/_rels/slide${index + 1}.xml.rels`, slideRels());
  });

  return zipFiles(files);
}

function contentTypes(document) {
  const slideOverrides = document.slides
    .map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`)
    .join("");
  return xmlDeclaration(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
${slideOverrides}
</Types>`);
}

function rootRels() {
  return xmlDeclaration(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
}

function appProps(document) {
  return xmlDeclaration(`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>Prompt Presentation Studio</Application>
<PresentationFormat>Wide Screen</PresentationFormat>
<Slides>${document.slides.length}</Slides>
<Company></Company>
<AppVersion>0.1.0</AppVersion>
</Properties>`);
}

function coreProps(document) {
  const created = escapeXml(document.createdAt);
  const updated = escapeXml(document.updatedAt);
  return xmlDeclaration(`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${escapeXml(document.title)}</dc:title>
<dc:creator>Prompt Presentation Studio</dc:creator>
<cp:lastModifiedBy>Prompt Presentation Studio</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${updated}</dcterms:modified>
</cp:coreProperties>`);
}

function presentationXml(document) {
  const slideIds = document.slides
    .map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`)
    .join("");
  return xmlDeclaration(`<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst>${slideIds}</p:sldIdLst>
<p:sldSz cx="${SLIDE_EMU.width}" cy="${SLIDE_EMU.height}" type="wide"/>
<p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`);
}

function presentationRels(document) {
  const slideRels = document.slides
    .map((_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`)
    .join("");
  return xmlDeclaration(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
${slideRels}
</Relationships>`);
}

function slideMasterXml() {
  return xmlDeclaration(`<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${groupShape()}</p:spTree></p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
<p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>`);
}

function slideMasterRels() {
  return xmlDeclaration(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`);
}

function slideLayoutXml() {
  return xmlDeclaration(`<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
<p:cSld name="Blank"><p:spTree>${groupShape()}</p:spTree></p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`);
}

function slideLayoutRels() {
  return xmlDeclaration(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`);
}

function slideRels() {
  return xmlDeclaration(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`);
}

function slideXml(document, slide, slideIndex) {
  let shapeId = 2;
  const shapes = [];
  for (const object of slide.objects) {
    const result = objectToPptxXml(object, shapeId, document.theme);
    shapes.push(result.xml);
    shapeId = result.nextId;
  }

  if (slide.speakerScript) {
    shapes.push(notesTextShape(slide.speakerScript, shapeId));
  }

  return xmlDeclaration(`<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld name="${escapeXml(slide.title || `Slide ${slideIndex + 1}`)}"><p:spTree>${groupShape()}${shapes.join("")}</p:spTree></p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`);
}

function objectToPptxXml(object, shapeId, theme) {
  if (object.type === "text") {
    return { xml: textShapeXml(object, shapeId, object.content || ""), nextId: shapeId + 1 };
  }
  if (object.type === "chart") {
    return chartXml(object, shapeId, theme);
  }
  if (object.type === "shape") {
    return shapeXml(object, shapeId, theme);
  }
  return imagePlaceholderXml(object, shapeId, theme);
}

function textShapeXml(object, shapeId, content, options = {}) {
  const style = object.style || {};
  const fontSize = Number(style.fontSize || options.fontSize || 22);
  const color = cleanColor(style.fill || options.color || "#111827");
  const bold = style.fontWeight && Number(style.fontWeight) >= 700 ? ' b="1"' : "";
  const align = style.align === "center" ? "ctr" : style.align === "right" ? "r" : "l";
  const paragraphs = String(content || " ")
    .split(/\n+/)
    .map((line) => `<a:p><a:pPr algn="${align}"/><a:r><a:rPr lang="ko-KR" sz="${Math.round(fontSize * 100)}"${bold}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Aptos"/><a:ea typeface="Malgun Gothic"/></a:rPr><a:t>${escapeXml(line)}</a:t></a:r><a:endParaRPr lang="ko-KR" sz="${Math.round(fontSize * 100)}"/></a:p>`)
    .join("");

  return `<p:sp>
<p:nvSpPr><p:cNvPr id="${shapeId}" name="Text ${shapeId}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
<p:spPr>${xfrm(object)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>
<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>${paragraphs}</p:txBody>
</p:sp>`;
}

function shapeXml(object, shapeId, theme) {
  const shape = object.style?.shape || "rect";
  if (shape === "timeline") {
    return timelineXml(object, shapeId, theme);
  }
  if (shape === "comparison") {
    return comparisonXml(object, shapeId, theme);
  }
  if (shape === "summary") {
    return summaryXml(object, shapeId, theme);
  }

  let xml = baseShapeXml(object, shapeId, theme);
  let nextId = shapeId + 1;
  if (object.style?.label) {
    const labelObject = {
      ...object,
      x: object.x + 36,
      y: object.y + object.height - 118,
      width: object.width - 72,
      height: 84,
      rotation: object.rotation,
      style: { fill: object.style.labelColor || theme.text, fontSize: object.style.labelSize || 24, fontWeight: 800, align: "left" },
    };
    xml += textShapeXml(labelObject, nextId, object.style.label);
    nextId += 1;
  }
  return { xml, nextId };
}

function baseShapeXml(object, shapeId, theme, overrides = {}) {
  const style = { ...(object.style || {}), ...overrides };
  const prst = style.shape === "ellipse" ? "ellipse" : style.shape === "roundRect" ? "roundRect" : "rect";
  const fill = style.fill === "transparent" ? "<a:noFill/>" : `<a:solidFill><a:srgbClr val="${cleanColor(style.fill || theme.surface)}"/></a:solidFill>`;
  const line = style.stroke && style.stroke !== "transparent"
    ? `<a:ln w="12700"><a:solidFill><a:srgbClr val="${cleanColor(style.stroke)}"/></a:solidFill></a:ln>`
    : "<a:ln><a:noFill/></a:ln>";
  return `<p:sp>
<p:nvSpPr><p:cNvPr id="${shapeId}" name="Shape ${shapeId}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr>${xfrm(object)}<a:prstGeom prst="${prst}"><a:avLst/></a:prstGeom>${fill}${line}</p:spPr>
</p:sp>`;
}

function chartXml(object, shapeId, theme) {
  const style = object.style || {};
  const chartSpec = object.chartSpec || { labels: [], values: [], unit: "", title: "" };
  let xml = baseShapeXml(object, shapeId, theme, { fill: style.fill || theme.surface, stroke: style.stroke || "#d7dee8", shape: "roundRect" });
  let nextId = shapeId + 1;
  xml += textShapeXml({ ...object, x: object.x + 28, y: object.y + 24, width: object.width - 56, height: 34, style: { fill: theme.text, fontSize: 18, fontWeight: 800 } }, nextId, chartSpec.title || "Chart");
  nextId += 1;

  const values = chartSpec.values || [];
  const labels = chartSpec.labels || [];
  const max = Math.max(1, ...values);
  const gap = 18;
  const availableWidth = object.width - 74;
  const barWidth = Math.max(34, (availableWidth - gap * Math.max(0, values.length - 1)) / Math.max(1, values.length));
  values.forEach((value, index) => {
    const barHeight = Math.max(18, ((object.height - 150) * value) / max);
    const bar = {
      id: `${object.id}_bar_${index}`,
      type: "shape",
      x: object.x + 36 + index * (barWidth + gap),
      y: object.y + object.height - 76 - barHeight,
      width: barWidth,
      height: barHeight,
      rotation: 0,
      style: { shape: "rect", fill: style.barColor || theme.accent, stroke: "transparent" },
    };
    xml += baseShapeXml(bar, nextId, theme);
    nextId += 1;
    xml += textShapeXml({ ...bar, y: object.y + object.height - 64, height: 28, style: { fill: theme.mutedText, fontSize: 10, fontWeight: 600, align: "center" } }, nextId, labels[index] || "");
    nextId += 1;
    xml += textShapeXml({ ...bar, y: bar.y - 24, height: 20, style: { fill: theme.text, fontSize: 11, fontWeight: 800, align: "center" } }, nextId, `${value}${chartSpec.unit || ""}`);
    nextId += 1;
  });
  return { xml, nextId };
}

function timelineXml(object, shapeId, theme) {
  const style = object.style || {};
  const items = String(style.items || "").split("|").filter(Boolean);
  let xml = baseShapeXml(object, shapeId, theme, { fill: style.fill || theme.surface, stroke: style.stroke || "#d7dee8", shape: "roundRect" });
  let nextId = shapeId + 1;
  const line = {
    id: `${object.id}_line`,
    type: "shape",
    x: object.x + 56,
    y: object.y + object.height / 2 - 3,
    width: object.width - 112,
    height: 6,
    rotation: 0,
    style: { shape: "rect", fill: style.accent || theme.accent, stroke: "transparent" },
  };
  xml += baseShapeXml(line, nextId, theme);
  nextId += 1;
  items.forEach((item, index) => {
    const x = object.x + 62 + index * ((object.width - 124) / Math.max(1, items.length - 1));
    const dot = {
      id: `${object.id}_dot_${index}`,
      type: "shape",
      x: x - 15,
      y: object.y + object.height / 2 - 15,
      width: 30,
      height: 30,
      rotation: 0,
      style: { shape: "ellipse", fill: style.accent || theme.accent, stroke: "transparent" },
    };
    xml += baseShapeXml(dot, nextId, theme);
    nextId += 1;
    xml += textShapeXml({ ...dot, x: x - 58, y: object.y + object.height / 2 + 32, width: 116, height: 70, style: { fill: style.text || theme.text, fontSize: 13, fontWeight: 700, align: "center" } }, nextId, item);
    nextId += 1;
  });
  return { xml, nextId };
}

function comparisonXml(object, shapeId, theme) {
  const style = object.style || {};
  const items = String(style.items || "").split("|").filter(Boolean);
  let xml = baseShapeXml(object, shapeId, theme, { fill: style.fill || theme.surface, stroke: style.stroke || "#d7dee8", shape: "roundRect" });
  let nextId = shapeId + 1;
  const columnWidth = (object.width - 74) / 2;
  const labels = ["Current", "Improved"];
  labels.forEach((label, index) => {
    const column = {
      id: `${object.id}_col_${index}`,
      type: "shape",
      x: object.x + 28 + index * (columnWidth + 18),
      y: object.y + 72,
      width: columnWidth,
      height: object.height - 112,
      rotation: 0,
      style: { shape: "roundRect", fill: index === 0 ? "#f1f4f8" : lighten(style.accent || theme.accent), stroke: "transparent" },
    };
    xml += baseShapeXml(column, nextId, theme);
    nextId += 1;
    xml += textShapeXml({ ...column, y: column.y + 20, height: 38, style: { fill: theme.text, fontSize: 16, fontWeight: 800, align: "center" } }, nextId, label);
    nextId += 1;
    xml += textShapeXml({ ...column, x: column.x + 18, y: column.y + 76, width: column.width - 36, height: 120, style: { fill: theme.text, fontSize: 12, fontWeight: 500, align: "left" } }, nextId, items[index] || items[0] || "");
    nextId += 1;
  });
  return { xml, nextId };
}

function summaryXml(object, shapeId, theme) {
  const style = object.style || {};
  const items = String(style.items || "").split("|").filter(Boolean);
  let xml = baseShapeXml(object, shapeId, theme, { fill: style.fill || theme.surface, stroke: style.stroke || "#d7dee8", shape: "roundRect" });
  let nextId = shapeId + 1;
  xml += textShapeXml({ ...object, x: object.x + 34, y: object.y + 30, width: object.width - 68, height: 42, style: { fill: theme.text, fontSize: 18, fontWeight: 800 } }, nextId, style.label || "Core message");
  nextId += 1;
  items.forEach((item, index) => {
    const pill = {
      id: `${object.id}_pill_${index}`,
      type: "shape",
      x: object.x + 36,
      y: object.y + 92 + index * 50,
      width: object.width - 72,
      height: 34,
      rotation: 0,
      style: { shape: "roundRect", fill: index % 2 === 0 ? lighten(style.accent || theme.accent) : "#eef2f7", stroke: "transparent" },
    };
    xml += baseShapeXml(pill, nextId, theme);
    nextId += 1;
    xml += textShapeXml({ ...pill, x: pill.x + 18, y: pill.y + 8, width: pill.width - 36, height: 20, style: { fill: theme.text, fontSize: 12, fontWeight: 700 } }, nextId, item);
    nextId += 1;
  });
  return { xml, nextId };
}

function imagePlaceholderXml(object, shapeId, theme) {
  const xml = baseShapeXml(object, shapeId, theme, { fill: "#eef2f7", stroke: "#cbd5e1", shape: "rect" })
    + textShapeXml({ ...object, x: object.x + 16, y: object.y + object.height / 2 - 18, width: object.width - 32, height: 36, style: { fill: theme.mutedText, fontSize: 16, fontWeight: 700, align: "center" } }, shapeId + 1, "Image placeholder");
  return { xml, nextId: shapeId + 2 };
}

function notesTextShape(script, shapeId) {
  const object = {
    id: `speaker_${shapeId}`,
    type: "text",
    x: 840,
    y: 630,
    width: 360,
    height: 44,
    rotation: 0,
    style: { fill: "#64748b", fontSize: 10, fontWeight: 500, align: "right" },
  };
  return textShapeXml(object, shapeId, `Script: ${script}`);
}

function groupShape() {
  return `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`;
}

function themeXml(document) {
  const theme = document.theme;
  return xmlDeclaration(`<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${escapeXml(theme.name)}">
<a:themeElements>
<a:clrScheme name="PromptStudio">
<a:dk1><a:srgbClr val="${cleanColor(theme.text)}"/></a:dk1>
<a:lt1><a:srgbClr val="${cleanColor(theme.background)}"/></a:lt1>
<a:dk2><a:srgbClr val="${cleanColor(theme.primary)}"/></a:dk2>
<a:lt2><a:srgbClr val="${cleanColor(theme.surface)}"/></a:lt2>
<a:accent1><a:srgbClr val="${cleanColor(theme.primary)}"/></a:accent1>
<a:accent2><a:srgbClr val="${cleanColor(theme.accent)}"/></a:accent2>
<a:accent3><a:srgbClr val="2a9d8f"/></a:accent3>
<a:accent4><a:srgbClr val="e9c46a"/></a:accent4>
<a:accent5><a:srgbClr val="f4a261"/></a:accent5>
<a:accent6><a:srgbClr val="264653"/></a:accent6>
<a:hlink><a:srgbClr val="0563C1"/></a:hlink>
<a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="PromptStudio"><a:majorFont><a:latin typeface="Aptos Display"/><a:ea typeface="Malgun Gothic"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/><a:ea typeface="Malgun Gothic"/></a:minorFont></a:fontScheme>
<a:fmtScheme name="PromptStudio"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>
</a:themeElements>
<a:objectDefaults/><a:extraClrSchemeLst/>
</a:theme>`);
}

function xfrm(object) {
  const x = pxToEmu(object.x);
  const y = pxToEmu(object.y);
  const cx = pxToEmu(Math.max(1, object.width));
  const cy = pxToEmu(Math.max(1, object.height));
  const rotation = Math.round((object.rotation || 0) * 60000);
  return `<a:xfrm rot="${rotation}"><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>`;
}

function pxToEmu(value) {
  return Math.round((Number(value) / PX_PER_INCH) * EMU_PER_INCH);
}

function cleanColor(value) {
  const text = String(value || "000000").trim();
  if (text === "transparent") {
    return "FFFFFF";
  }
  const hex = text.startsWith("#") ? text.slice(1) : text;
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return hex.toUpperCase();
  }
  return "000000";
}

function lighten(value) {
  const color = cleanColor(value);
  const parts = [0, 2, 4].map((start) => parseInt(color.slice(start, start + 2), 16));
  return `#${parts.map((part) => Math.min(255, Math.round(part + (255 - part) * 0.78)).toString(16).padStart(2, "0")).join("")}`;
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlDeclaration(xml) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${xml}`;
}

function zipFiles(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const [name, content] of files.entries()) {
    const nameBuffer = Buffer.from(name);
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
    const crc = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBuffer, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.size, 8);
  end.writeUInt16LE(files.size, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

const CRC_TABLE = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
