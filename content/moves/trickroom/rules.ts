/**
 * 戏法空间 / trickroom 的区域规则与速度倒转，对所有战斗者一致。
 *
 * 空间是一条区域规则：每 5 刻扫描半径内的活体。成员归属按「空间实例」跟踪——每个空间为自己的
 * 覆盖对象维护一份 StatusContributions 贡献（共享身份 world_combat:status/trickroom 的 MobEffect，
 * 本单元效果 world_combat:trickroom_shift）。因此重叠的两片空间各算各的：离开一片、仍被另一片覆盖时，
 * 不会解除全部效果。
 *
 * 速度倒转落到所有活体共用的移动速度属性 minecraft:generic.movement_speed：带该身份的活体挂一份
 * 每 5 刻重算的临时属性修饰，把移动速度变成 基准²÷自身移动速度——慢于基准的被推快、快于基准的被拖慢。
 * 读取自身速度时排除本空间自己的修饰，防止每 5 刻复乘。活体的规则只从「对它仍然有效的空间贡献」
 * 里选：几何上盖住、却没给它贡献的空间（墙后、视线被挡）不参与，再按最近中心、距离相同取更小 id 定。
 * 被根须／冻结压到 0 的活体不凭空加速；倍率夹在最低倍率与它的倒数之间，最低倍率越低扭得越狠。双方平等：
 * 谁在空间里谁被扭，走出去立刻恢复，空间结束整片复原。
 */
namespace PokemonSkills {
    const trickRoomMovement = "minecraft:generic.movement_speed";
    /** 表现里 `data.scale = 实际半径 / 这个数`。 */
    const trickRoomReferenceRadius = 3.6;
    /**
     * 每位受效者上一次真正落地的倍率（由属性 resolver 在自己的 owner scope 里算出）。
     * 它驱动「入圈／规则变化」的提示，避免 field 层用错 scope 的 baseline 重复假推导。
     */
    let trickRoomFeel: { [ref: string]: number } = Object.create(null);

    export interface TrickRoomRule { reference: number; depth: number; }

    function trickRoomRule(data: any): TrickRoomRule {
        const reference = Number(data && data.reference), depth = Number(data && data.depth);
        return { reference: isFinite(reference) && reference > 0 ? reference : 0.184,
            depth: isFinite(depth) && depth > 0.15 && depth <= 1 ? depth : 0.5 };
    }
    function trickRoomCentre(position: number[]): CombatPoint {
        return WorldCombat.point(position[0], position[1], position[2]);
    }
    /**
     * 覆盖该活体的空间规则：只认 StatusContributions 里对本活体仍然有效的贡献 token，
     * 与活体空间按 area.id 匹配后再取最近中心（距离相同取更小 id）。几何上盖住但没给这名成员
     * 贡献的空间（墙后、视线被挡）不会接管规则。
     */
    function trickRoomRuleAt(world: CombatWorld, actor: CombatActor): TrickRoomRule | null {
        const body = world.observe(actor);
        if (body === null) return null;
        const contributions = StatusContributions.list(world, actor, trickRoomShift);
        if (contributions.length === 0) return null;
        const tokens: { [id: string]: boolean } = Object.create(null);
        for (let i = 0; i < contributions.length; i++) tokens[contributions[i].token] = true;
        const areas = WorldEffects.areas(world, trickRoomField);
        let best: WorldEffects.Area | null = null, bestId = 0, bestDistance = Infinity;
        for (let i = 0; i < areas.length; i++) {
            const area = areas[i];
            if (!tokens[String(area.id)]) continue;
            const distance = body.position().minus(trickRoomCentre(area.position)).length();
            if (distance > area.radius) continue;
            const closer = distance < bestDistance - 0.0001;
            const tied = best !== null && Math.abs(distance - bestDistance) <= 0.0001 && area.id < bestId;
            if (best === null || closer || tied) { best = area; bestId = area.id; bestDistance = distance; }
        }
        return best === null ? null : trickRoomRule(best.data);
    }
    /** 离开这一片后是否仍被别的戏法空间罩住：只看是否还留有有效贡献，是则不收回、不播复原。 */
    function trickRoomCovered(world: CombatWorld, actor: CombatActor): boolean {
        return StatusContributions.list(world, actor, trickRoomShift).length > 0;
    }
    /** 目标：移动速度 → 基准²÷自身速度，即倍率 (基准÷自身速度)²；夹在 depth 与它的倒数之间。 */
    function trickRoomFactor(baseline: number, rule: TrickRoomRule): number {
        if (!(baseline > 0) || !(rule.reference > 0)) return 1;
        const ratio = rule.reference / baseline;
        return Math.max(rule.depth, Math.min(1 / rule.depth, ratio * ratio));
    }
    function trickRoomBaseline(world: CombatWorld, actor: CombatActor): number {
        const attribute = world.attributeValue(actor, trickRoomMovement, true);
        return attribute === null ? 0 : attribute.value();
    }
    /** 真实倍率变化的提示：受效者身上的一对箭头，按实际方向与幅度发出。 */
    function trickRoomReveal(world: CombatWorld, actor: CombatActor, factor: number): void {
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, trickRoomScene, 1, body.position(), {
            moment: "flip", target: String(actor.ref()), arrowY: factor >= 1 ? 1 : -1,
            magnitude: Math.max(0.12, Math.min(2, Math.abs(factor - 1))),
            intensity: Math.max(0.4, Math.min(2.2, factor)) }, 22);
    }

    // 成员归属：每个空间实例一条独立贡献，窗口沿用该场的真实剩余时间；carrier 只在这些贡献都消失后才被收回。
    WorldEffects.membership(trickRoomField, trickRoomShift, {
        ticks: function (field: WorldEffects.Field): number { return Math.max(1, Math.round(field.remaining || 1)); }
    });

    // 速度兑现：带 carrier 的活体每 5 刻按当前覆盖空间重算同一个属性修饰。清掉 carrier 即释放；
    // 找不到有效空间时也用同一个 id 写 0，撤掉旧修饰而不是留着它。
    // 这里在自己的 owner scope 里读 baseline（正确排除本窗口的修饰），所以算出的倍率是真实生效值；
    // 倍率真正变化（首次入圈、重叠规则切换）时由它发一次提示，离开复原也在这里兜底。
    MobEffects.dynamicAttributes("world_combat:trickroom_shift_motion", trickRoomShift, function (world, actor) {
        const rule = trickRoomRuleAt(world, actor);
        const key = String(actor.ref());
        if (rule === null) {
            if (trickRoomFeel[key] !== undefined) {
                delete trickRoomFeel[key];
                const body = world.observe(actor);
                if (body !== null) WorldFeedback.emit(world, trickRoomScene, 1, body.position(),
                    { moment: "unflip", target: key }, 18);
            }
            return [{ id: trickRoomMovement, amount: 0, operation: "add_multiplied_total" }];
        }
        const factor = trickRoomFactor(trickRoomBaseline(world, actor), rule);
        const previous = trickRoomFeel[key];
        if (previous === undefined || Math.abs(previous - factor) > 0.02) {
            trickRoomFeel[key] = factor;
            if (Math.abs(factor - 1) > 0.02) trickRoomReveal(world, actor, factor);
        }
        return [{ id: trickRoomMovement, amount: factor - 1, operation: "add_multiplied_total" }];
    }, 5);

    // 画面：离开／持续。持续层绑在场效果上，场结束即随它收；入圈提示由上面的真实倍率 resolver 负责。
    WorldEffects.fieldRules.define({ id: "world_combat:move_trickroom/members", apply: function (context) {
        const world = context.world, field = context.field, actor = context.actor;
        if (context.phase === "leave" && actor !== null) {
            if (trickRoomCovered(world, actor)) return;
            const key = String(actor.ref());
            if (trickRoomFeel[key] === undefined) return;
            delete trickRoomFeel[key];
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, trickRoomScene, 1, body.position(), { moment: "unflip", target: key }, 18);
            return;
        }
        if (context.phase === "scan") {
            const id = field.id === undefined ? 0 : field.id;
            if (id <= 0) return;
            WorldFeedback.onEffect(world, id, "world_combat:move_trickroom/field/" + id, trickRoomScene, 1,
                trickRoomCentre(field.position), { moment: "inside", density: Number(field.data.density) || 24,
                    scale: field.radius / trickRoomReferenceRadius });
        }
    } });
}
