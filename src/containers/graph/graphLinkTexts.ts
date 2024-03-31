import { ForceGraph3DInstance } from "3d-force-graph";
import SpriteText from "three-spritetext";
import { ILink } from "./helpers";
// @ts-ignore
import { Vector3 } from "three";
function setGraphLinkTexts({
  graph,
  showLinkTexts,
}: {
  graph: ForceGraph3DInstance;
  showLinkTexts: boolean;
}) {
  graph
    .linkThreeObject((link: any) => {
      if (showLinkTexts) {
        // extend link with text sprite
        const sprite = new SpriteText(link.type);
        sprite.color = "lightgrey";
        sprite.textHeight = 1.5;
        return sprite;
      }
      return false;
    })
    .linkPositionUpdate((sprite, { start, end }, link) => {
      if (sprite) {
        const middlePos: { [key: string]: number } = {};
        const plink: ILink = link as ILink;
        (["x", "y", "z"] as const).forEach((xyz) => {
          middlePos[xyz] = start[xyz] + (end[xyz] - start[xyz]) / 2;
        });
        if (plink.curvature > 0) {
          let vDiff = new Vector3(0, 0, 0).subVectors(end, start).normalize();

          let V = new Vector3(
            vDiff.y + vDiff.x * vDiff.z,
            vDiff.y * vDiff.z - vDiff.x,
            -(vDiff.x * vDiff.x) - vDiff.y * vDiff.y,
          );

          const t = V.applyAxisAngle(
            vDiff,
            plink.rotation / plink.curvature - 0.5,
          ).applyAxisAngle(
            new Vector3().multiplyVectors(V, vDiff).normalize(),
            (15 * Math.PI) / 180,
          );
          t.multiplyScalar(plink.curvature * 10);

          const translated = {
            x: middlePos.x + t.x,
            y: middlePos.y + t.y,
            z: middlePos.z + t.z,
          };
          Object.assign(sprite.position, translated);
        } else {
          // Position sprite
          Object.assign(sprite.position, middlePos);
        }
      }
    });
}

export default setGraphLinkTexts;
