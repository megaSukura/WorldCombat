/** Native companion observations projected into generic world UI records. */
namespace CobblemonWorldUi {
    export const typeLabels: any = { grass: "草", poison: "毒", normal: "一般", fire: "火", water: "水", electric: "电", ice: "冰",
        fighting: "格斗", flying: "飞行", psychic: "超能", bug: "虫", rock: "岩石", ground: "地面", ghost: "幽灵", dragon: "龙", dark: "恶", steel: "钢", fairy: "妖精" };
    export function actor(value: any): string { return typeof value === "string" ? value.split("/")[0] : value && value.entity || ""; }
    export class SelectionFeed {
        private feedbackSequence = 0;
        constructor(private onFailure: (actor: string, reason: string) => void) {}
        reset(): void { this.feedbackSequence = 0; }
        update(state: any, extra: any): WorldSurfaces.Record | null {
            if (!state || !state.actor || state.entityId < 0 || state.inspection) return null;
            const id = actor(state.actor);
            if (state.feedbackSequence && state.feedbackSequence !== this.feedbackSequence) {
                this.feedbackSequence = state.feedbackSequence;
                if (!state.feedbackUntil || state.feedbackUntil >= state.clientTick) this.onFailure(id, String(state.feedbackReason || ""));
            }
            const data: any = { name: state.name, intent: state.intent, stage: state.stage, selected: true };
            Object.keys(extra || {}).forEach(key => { data[key] = extra[key]; });
            return { actor: id, data, priority: 10 };
        }
    }
    export function identityRows(anchor: any, name: string, healthColor?: number): WorldSurfaces.Row[] {
        const ratio = Math.max(0, Math.min(1, anchor.health / Math.max(1, anchor.maxHealth)));
        return [{ kind: "text", text: name || anchor.name, color: 0xffeff2dd, height: 12 },
            { kind: "meter", value: ratio, color: ratio < .3 ? 0xffec967f : healthColor || 0xffa6d9ab }];
    }
    export function target(value: any): WorldSurfaces.Overlay | null {
        if (!value) return null;
        const aim = value.aim, id = actor(aim.target), entity = value.targetMode !== "point" && id && id !== "00000000-0000-0000-0000-000000000000";
        return { actor: entity ? id : undefined, point: entity ? undefined : [aim.point.x, aim.point.y, aim.point.z], width: 98, background: 0xed193e30,
            rows: [{ kind: "text", text: value.label, color: 0xffe4f1c4 }, { kind: "text", text: UiSurfaces.t("worldcombat.ui.target_controls",value.confirm,value.back), color: 0xffacd1b3 }] };
    }
}
