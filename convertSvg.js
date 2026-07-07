import { DOMParser, XMLSerializer } from "xmldom";
import xpath from "xpath";
import { v4 as uuidv4 } from "uuid";

/**
 * Recursively make IDs unique within an element subtree
 * IMPORTANT: children keep the original prefix
 */
function makeIdsUnique(element, prefix) {
  if (element.hasAttribute && element.hasAttribute("id")) {
    const oldId = element.getAttribute("id");
    const uniqueSuffix = uuidv4().replace(/-/g, "").slice(0, 8);
    element.setAttribute("id", `${prefix}_${oldId}_${uniqueSuffix}`);
  }

  // Recurse through children
  if (element.childNodes) {
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes[i];
      if (child.nodeType === 1) {
        makeIdsUnique(child, prefix);
      }
    }
  }
}

/**
 * Replace <use> elements with expanded <g> groups
 */
function replaceUseWithGroups(svgData) {
  const doc = new DOMParser().parseFromString(svgData, "image/svg+xml");

  const select = xpath.useNamespaces({
    svg: "http://www.w3.org/2000/svg",
    inkscape: "http://www.inkscape.org/namespaces/inkscape",
    xlink: "http://www.w3.org/1999/xlink"
  });

  // Find all <use> elements
  const useElements = select("//svg:use", doc);

  useElements.forEach(useEl => {
    const href =
      useEl.getAttribute("xlink:href") ||
      useEl.getAttributeNS("http://www.w3.org/1999/xlink", "href");

    if (!href) return;

    const symbolId = href.replace(/^#/, "");

    // Find corresponding <symbol>
    const symbolEls = select(
      `//svg:symbol[@id='${symbolId}']`,
      doc
    );

    if (!symbolEls.length) return;

    const symbolEl = symbolEls[0];

    // Deep copy symbol
    const symbolCopy = symbolEl.cloneNode(true);

    // Create new <g> element
    const g = doc.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );

    // Ensure unique IDs
    makeIdsUnique(symbolCopy, symbolId);

    // Move children of symbol into <g>
    const children = [];
    for (let i = 0; i < symbolCopy.childNodes.length; i++) {
      children.push(symbolCopy.childNodes[i]);
    }
    children.forEach(child => g.appendChild(child));

    // Copy transform from <use>
    const transform = useEl.getAttribute("transform");
    if (transform) {
      g.setAttribute("transform", transform);
    }

    // Copy inkscape:label
    const label = useEl.getAttributeNS(
      "http://www.inkscape.org/namespaces/inkscape",
      "label"
    );
    if (label) {
      g.setAttributeNS(
        "http://www.inkscape.org/namespaces/inkscape",
        "inkscape:label",
        label
      );
    }

    // Copy <desc> if present
    const desc = select("svg:desc", useEl)[0];
    if (desc) {
      g.appendChild(desc.cloneNode(true));
    }

    // Replace <use> with <g>
    const parent = useEl.parentNode;
    parent.replaceChild(g, useEl);
  });

  // Write output SVG
  const serializer = new XMLSerializer();
  const output = serializer.serializeToString(doc);

  return output;
}
export default replaceUseWithGroups;
