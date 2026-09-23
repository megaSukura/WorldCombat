/**
 * 换场 / courtchange —— 执行组织。
 *
 * 核心念头：一记对称的魔法扫过战场，把双方已经铺开的领域**对调归属**——敌方铺下的漩涡、禁锢、尖刺转眼为对方所用，
 *   我方的治疗之泉、护佑也一并交出去；你会失去自己的领域，同时接管对方的。这是真正的双向取舍，也是原生
 *   「交换双方的场地效果」在世界里唯一说得通的读法（这里没有「一侧」，只有领域的来源阵营）。
 *
 * 两幕：
 *   铺（windup 播「结阵」，提交前只观察与预告，打断不花代价）。
 *   换（提交后）：以选定的落点为中心，扫出半径内的所有共享领域效果（world_combat:field），按来源阵营判定敌我；
 *     敌方的过户给我，我方的过户给最近的敌人；过户通过共享领域效果的换场操作完成（复制到新来源、清空成员、
 *     结束原领域），所有失败都在调用侧隔离，不影响其余领域。随后表现扫过战场。
 * 领域：不新造机制——沿用各领域自己的规则、半径、时长与数据；换场只搬来源归属，搬完由领域自己重新扫描新阵营。
 * 反制：法阵有半径与落点，站远或把领域铺得分散就能少被换走；换走后领域仍会到期。
 */
namespace PokemonSkills {
    const courtChangeFieldEffect = "world_combat:field";
    /** 表现里的参考半径：`data.scale = 实际换场半径 / 这个数`。 */
    const courtChangeReferenceRadius = 4;

    function courtChangePointOf(state: any): CombatPoint | null {
        if (!Array.isArray(state.position) || state.position.length !== 3) return null;
        const values = state.position;
        for (let index = 0; index < 3; index++) if (typeof values[index] !== "number" || !isFinite(values[index])) return null;
        return WorldCombat.point(values[0], values[1], values[2]);
    }

    export interface CourtChangeField { id: number; source: CombatActor; rule: string; radius: number; point: CombatPoint; friendly: boolean; }

    /** 扫出中心半径内的所有共享领域效果（含施法者自己的）。 */
    export function courtChangeScan(world: CombatWorld, center: CombatPoint, radius: number): CourtChangeField[] {
        const result: CourtChangeField[] = [], seen: { [id: number]: boolean } = {};
        const actors = world.query(center, Math.min(32, Math.max(radius + 10, 12)), false);
        const consider = function (holder: CombatActor): void {
            if (!world.valid(holder)) return;
            const views = world.effects(holder, courtChangeFieldEffect);
            for (let index = 0; index < views.length; index++) {
                const view = views[index];
                if (seen[view.id()]) continue;
                seen[view.id()] = true;
                let state: any;
                try { state = JSON.parse(String(view.data())); } catch (error) { continue; }
                const point = courtChangePointOf(state);
                if (point === null || point.minus(center).length() > radius) continue;
                result.push({ id: view.id(), source: view.source(), rule: String(state.rule || ""),
                    radius: Math.max(0.5, Number(state.radius) || 1), point: point, friendly: world.friendly(view.source()) });
            }
        };
        consider(world.source());
        for (let index = 0; index < actors.length; index++) consider(actors[index]);
        return result;
    }

    function courtChangeNearestEnemy(world: CombatWorld, point: CombatPoint, radius: number): CombatActor | null {
        const actors = world.query(point, Math.min(32, Math.max(6, radius)), false);
        let best: CombatActor | null = null, bestDistance = Infinity;
        for (let index = 0; index < actors.length; index++) {
            const other = actors[index];
            if (world.friendly(other)) continue;
            const body = world.observe(other);
            if (body === null || body.health() <= 0) continue;
            const distance = body.position().minus(point).length();
            if (distance >= bestDistance) continue;
            best = other; bestDistance = distance;
        }
        return best;
    }

    /** 把一处领域过户给 holderRef；失败（来源不可控等）返回 false，不影响其余领域。 */
    function courtChangeMoveField(world: CombatWorld, id: number, holderRef: string): boolean {
        try { return world.operation(id, courtChangeReassign, JSON.stringify({ holder: holderRef })); }
        catch (error) { return false; }
    }

    // 在共享领域效果 world_combat:field 上追加一个换场操作：把领域连数据、连剩余时长复制到一个新来源，
    // 并清空成员，使它在新归属下重新扫描；随后结束原领域。参数缺失时用 reject 安全拒绝。
    WorldCombat.effectHandler(courtChangeFieldEffect, "operation:" + courtChangeReassign, function (effect) {
        const request = JSON.parse(effect.input());
        const world = effect.world();
        const holder = typeof request.holder === "string" ? world.actor(request.holder) : null;
        if (holder === null) { effect.reject("holder-left"); return; }
        const state = JSON.parse(effect.state());
        state.members = [];
        effect.copyTo(holder, holder, JSON.stringify(state), effect.remaining());
        effect.end();
    });

    define({
        id: courtChangeId,
        cooldownParameter: "wait",
        name: "换场",
        description: "用念力扫过一片战场，把已经铺开的场地效果对调归属：敌方的领域过户给我方，我方的领域过户给敌方。你会失去自己的领域，同时接管对方的；领域只换主人，规则、半径与剩余时长都不变。",
        uses: ["把敌人铺下的危险领域一记收过来", "在对方脚下翻转漩涡与禁锢", "用自己的旧领域换掉对方更有用的领域"],
        kind: "point",
        range: 6,
        maxRange: 10,
        prepare: 10,
        active: 0,
        recover: 6,
        cooldown: 120,
        style: "court",
        defaults: { swift: false },
        fields: [flag("swift", "速换")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(courtChangeId, "field", pokemon) : 4, geometry: "area", style: "court",
                color: 0xE07AD8, label: config && config.swift === true ? "换场 · 速换" : "换场 · 稳换" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[courtChangeId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(courtChangeId, "tempo", context)),
                recover: Math.round(p(courtChangeId, "aftercast", context)),
                cooldown: Math.round(p(courtChangeId, "wait", context)),
                active: 0,
                range: p(courtChangeId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_courtchange:sigil", courtChangeScene, 1, action.origin(),
                JSON.stringify({ moment: "sigil", swift: config && config.swift === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor();
            const center = action.targetPosition();
            const radius = Math.max(2, p(courtChangeId, "field", action));
            const motes = Math.max(12, Math.round(p(courtChangeId, "motes", action)));
            const waves = Math.max(2, Math.min(5, Math.round(p(courtChangeId, "waves", action))));
            const scale = radius / courtChangeReferenceRadius;
            const fields = courtChangeScan(world, center, radius);
            const pathPoints: number[][] = [];
            let taken = 0, given = 0, refused = 0;
            for (let index = 0; index < fields.length; index++) {
                const entry = fields[index];
                pathPoints.push([entry.point.x(), entry.point.y(), entry.point.z()]);
                if (entry.friendly) {
                    const enemy = courtChangeNearestEnemy(world, entry.point, radius + 6);
                    if (enemy !== null && courtChangeMoveField(world, entry.id, String(enemy.ref()))) given++;
                    else refused++;
                } else {
                    if (courtChangeMoveField(world, entry.id, String(actor.ref()))) taken++;
                    else refused++;
                }
            }

            WorldFeedback.emit(world, courtChangeScene, 1, center,
                { moment: "swap", path: pathPoints, motes: motes, waves: waves, fields: fields.length,
                    taken: taken, given: given, refused: refused, scale: scale,
                    intensity: Math.max(0.8, Math.min(1.8, 0.8 + fields.length / 3)) }, 44);
            if (fields.length === 0) {
                WorldFeedback.emit(world, courtChangeScene, 1, center,
                    { moment: "empty", motes: motes, scale: scale }, 24);
                WorldFeedback.text(world, center.plus(WorldCombat.point(0, 1.1, 0)), courtChangeEmptyText, [], 28);
            } else {
                WorldFeedback.text(world, center.plus(WorldCombat.point(0, 1.1, 0)), courtChangeSwapText, [taken, given], 32);
            }
            world.sound("minecraft:entity.evoker.cast_spell", center, 16, "{}");
            world.sound("minecraft:block.beacon.power_select", center, 12, "{}");
            done(action);
        }
    });
}
