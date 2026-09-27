/**
 * 泼沙 / Sand Attack — 执行组织。
 *
 * 核心念头：从脚下向前踢起近距沙扇，低处起砂糊向脸。以自身为顶点朝瞄准方向踢开一片扇形砂砾，扇面里的敌人一起被糊；
 *   砂砾取自脚下真实的地面，颜色跟着那块方块走——沙地扬沙、泥地扬泥、石地扬灰，这招在不同地方长得不一样。
 *   扇面是全族最短的射程，代价换来了「一次糊一排」，也让对手能靠侧移、后退或掩体让开。
 *
 * 出手：短起手（windup 在脚边刨起尘）后提交；粗砂与细砂在张角、射程与深度之间取舍。
 * 选取：kind 为 aim——可以锁定一个方向或实体，也可以朝空地踢一脚；提交与执行都不要求存在敌人。
 * 命中：先按一份顶点把扇面在真实墙面上裁剪出来——沿身高带逐点向瞄准方向探路，取各层里能走到的最大距离，
 *   所以脚边的矮障不会把贴身那一层挡住；预告、显示与受体都读这同一份多边形边界。最多同时糊住 4 个非友方，
 *   只有状态真正落地才下降原生命中等级并播「糊脸」。
 * 反制：扇面短、只朝一个方向，并受地形截断；绕到侧面或掩体后就糊不到；砂粒颜色由脚下地面决定，玩家能预期它长什么样。
 * 表现：脚边起砂，沿裁剪出的扇面铺开；糊眼期间眼里没弄干净的余尘由一份 owned 托管标记承载，随状态被驱散或覆盖立即收场。
 */
namespace PokemonSkills {
    /** 糊眼余尘的 carried 标记：绑定这次 sand_blinded 的真实应用实例，驱散/刷新即收。 */
    const sandattackLinger = "world_combat:sandattack_linger";

    function sandattackAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 脚下地面决定砂砾的颜色：沙黄、砂砾灰、泥土褐、灵魂沙暗褐；没有可辨认的地面时用土黄兜底。 */
    function sandattackTint(block: CombatBlock | null): number {
        if (block === null) return 0xBFA77A;
        const id = String(block.id());
        if (block.tagged("minecraft:sand") || id.indexOf("sand") >= 0) return id.indexOf("red_sand") >= 0 ? 0xC98A5A : 0xD9C07A;
        if (id.indexOf("soul_sand") >= 0 || id.indexOf("soul_soil") >= 0) return 0x6B5844;
        if (id.indexOf("gravel") >= 0 || id.indexOf("cobble") >= 0 || id.indexOf("stone") >= 0 || id.indexOf("deepslate") >= 0) return 0x9A9A9A;
        if (id.indexOf("dirt") >= 0 || id.indexOf("podzol") >= 0 || id.indexOf("mud") >= 0 || id.indexOf("grass_block") >= 0) return 0x8A6A46;
        return 0xBFA77A;
    }

    /**
     * 按同一空间体积裁出扇面：沿身高带（脚踝、胸口、头顶）各打一条以瞄准方向为中轴的射线，取各层能走到的最大距离，
     * 于是「脚边矮障挡住贴地一层、身体高位照受沙」这种情况会保留扇面长度。返回的顶点同时供判定与表现使用。
     */
    function sandattackFan(world: CombatWorld, origin: CombatPoint, floor: number, heading: CombatPoint, range: number, angle: number): { vertices: CombatPoint[]; reach: number } {
        const half = angle * Math.PI / 360;
        const samples = Math.max(6, Math.min(15, Math.round(angle / 5) + 1));
        const base = WorldGeometry.flatUnit(heading, WorldCombat.point(0, 0, 1));
        const heights = [0.3, 1.0, 1.7];
        const vertices: CombatPoint[] = [WorldCombat.point(origin.x(), floor + 0.05, origin.z())];
        let reach = 0;
        for (let i = 0; i <= samples; i++) {
            const a = -half + (2 * half) * (i / samples);
            const dx = base.x() * Math.cos(a) - base.z() * Math.sin(a);
            const dz = base.x() * Math.sin(a) + base.z() * Math.cos(a);
            const ray = WorldCombat.point(dx, 0, dz);
            let best = 0;
            for (let h = 0; h < heights.length; h++) {
                const from = WorldCombat.point(origin.x(), floor + heights[h], origin.z());
                const hit = WorldGeometry.blockHit(world, from, from.plus(ray.scale(range)));
                const distance = hit === null ? range : Math.max(0.5, Math.min(range, hit.position().minus(from).length()));
                if (distance > best) best = distance;
                if (best >= range - 1e-6) break;
            }
            if (best > reach) reach = best;
            vertices.push(WorldCombat.point(origin.x() + ray.x() * best, floor + 0.05, origin.z() + ray.z() * best));
        }
        return { vertices: vertices, reach: reach };
    }

    // 足部起砂期间，目标身上持续飘着没弄干净的沙尘；这份余尘归 sand_blinded 的真实应用实例所有。
    WorldCombat.effect(sandattackLinger, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.key !== "string" || !value.key) throw new Error("Invalid sandattack linger key");
        if (typeof value.tint !== "number" || !isFinite(value.tint)) throw new Error("Invalid sandattack linger tint");
        if (typeof value.scale !== "number" || !isFinite(value.scale)) throw new Error("Invalid sandattack linger scale");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    function sandattackLingerPulse(effect: CombatEffect): void {
        const world = effect.world(), actor = effect.target();
        if (!world.valid(actor)) { effect.end(); return; }
        const state = JSON.parse(String(effect.state()));
        const carrier = MobEffects.read(world, actor, sandattackEffect);
        if (carrier === null || String(carrier.key()) !== String(state.key)) { effect.end(); return; }
        const body = world.observe(actor);
        if (body !== null)
            WorldFeedback.onEffect(world, effect.id(), "sandattack:linger:" + String(actor.ref()), sandattackScene, 1, body.position(),
                { moment: "linger", target: String(actor.ref()), tint: state.tint, scale: state.scale });
        effect.schedule("linger", "linger", 6, "{}");
    }
    WorldCombat.effectHandler(sandattackLinger, "start", sandattackLingerPulse);
    WorldCombat.effectHandler(sandattackLinger, "linger", sandattackLingerPulse);
    WorldCombat.effectHandler(sandattackLinger, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: sandattackId,
        cooldownParameter: "recharge",
        name: "泼沙",
        description: "朝瞄准方向踢出一片近距扇形砂砾，糊住范围内的敌人：近战攻击力下降并降低命中等级。可以踢向空地，也可以对着一群敌人一次糊一排；扇面很短，并会被掩体截断。",
        uses: ["近身一次糊住一排敌人", "替一次近战或撤退做铺垫", "朝狭窄通道踢一脚，把追兵糊在门口"],
        kind: "aim",
        range: 4,
        maxRange: 6,
        prepare: 6,
        active: 1,
        recover: 5,
        cooldown: 80,
        style: "sand",
        defaults: { grit: "coarse" },
        fields: [
            choice("grit", "砂质", ["coarse", "fine"], ["粗粝", "细腻"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[sandattackId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const coarse = !(config && config.grit === "fine");
            return {
                prepare: Math.round(p(sandattackId, "tempo", context)) + (coarse ? 3 : 0),
                recover: p(sandattackId, "recover", context),
                cooldown: Math.round(p(sandattackId, "recharge", context) * (coarse ? 1.1 : 0.95)),
                active: 1,
                range: Math.min(6, p(sandattackId, "coneRange", context) + (coarse ? -0.8 : 0.8))
            };
        },
        windup: function (action, config, prepare) {
            action.present("sandattack-windup", sandattackScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", grit: config && config.grit === "fine" ? "fine" : "coarse" }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[sandattackId], detail: { values: config } };
            const coarse = !(config && config.grit === "fine");
            return { radius: Math.max(2.5, p(sandattackId, "coneRange", context) + (coarse ? -0.8 : 0.8)),
                geometry: "line", style: "sand", color: 0xC9A86A, label: coarse ? "泼沙·粗粝" : "泼沙·细腻" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            const origin = body === null ? action.origin() : body.position();
            const feet = body === null ? origin : body.position().minus(WorldCombat.point(0, body.height() / 2, 0));
            const coarse = !(config && config.grit === "fine");
            const angle = Math.max(30, Math.min(100, Math.round(p(sandattackId, "coneAngle", action) * (coarse ? 1.35 : 0.85))));
            const range = Math.max(2.5, p(sandattackId, "coneRange", action) + (coarse ? -0.8 : 0.8));
            const duration = Math.max(50, Math.round(p(sandattackId, "duration", action) * (coarse ? 1.3 : 0.8)));
            const grains = Math.max(16, Math.round(p(sandattackId, "grains", action)));
            const stage = Math.max(1, Math.min(3, Math.round(p(sandattackId, "blindStage", action))));
            // 瞄准方向：锁定实体或地点用它的方向，空放用朝向；只取水平分量，扇面贴地铺开。
            const toward = action.targetPosition();
            const delta = toward.minus(origin);
            const direction = WorldGeometry.flatUnit(delta, action.direction());
            // 判定与显示共用同一份裁剪顶点：墙在哪个角度截断，画面就在哪里停。
            const fan = sandattackFan(world, origin, feet.y(), direction, range, angle);
            const reach = Math.max(0.75, fan.reach);
            const tint = sandattackTint(world.block(feet.minus(WorldCombat.point(0, 1, 0))));
            const scale = Math.max(0.6, Math.min(1.8, reach / 4));
            const path = fan.vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
            sound(action, "cobblemon:move.sandattack.actor");
            WorldFeedback.emit(world, sandattackScene, 1, feet,
                { moment: "spray", direction: [direction.x(), direction.y(), direction.z()],
                    flow: [direction.x() * 0.55, 1, direction.z() * 0.55], path: path,
                    reach: reach, angle: angle, grains: grains,
                    clods: Math.max(6, Math.round(grains * 0.35)), tint: tint, scale: scale }, 30);
            const region = WorldGeometry.bodyPolygon(fan.vertices, feet.y() - 0.5, feet.y() + Math.max(2.4, body === null ? 1.8 : body.height() + 1.2));
            let caught = 0;
            WorldGeometry.selectBodies(world, region, function (actor, facts) {
                if (caught >= 4 || facts.friendly() || String(actor.ref()) === String(self.ref())) return;
                // 只有状态真正落地才降命中、才播糊脸；被免疫或未应用时不当作已命中。
                if (MobEffects.read(world, actor, sandattackEffect) !== null) return;
                const carrier = MobEffects.apply(world, actor, sandattackEffect, duration, 0);
                if (carrier === null) return;
                NativeEffects.boostWindow(world, actor, { accuracy: -stage }, duration, "world_combat:move/sandattack", carrier, null);
                if (carrier !== null)
                    world.effect(sandattackLinger, actor,
                        JSON.stringify({ key: String(carrier.key()), tint: tint, scale: scale }), Math.max(1, carrier.duration()));
                const at = world.observe(actor);
                if (at !== null) {
                    WorldFeedback.emit(world, sandattackScene, 1, at.position(),
                        { moment: "splat", target: String(actor.ref()), grains: Math.max(10, Math.round(grains * 0.6)), tint: tint }, 32);
                    WorldFeedback.text(world, sandattackAbove(at.position()), "world_combat.move.sandattack.text.blind", [stage], 34);
                }
                caught++;
            });
            if (caught > 0) sound(action, "cobblemon:move.sandattack.target");
            else WorldFeedback.emit(world, sandattackScene, 1, feet.plus(direction.scale(reach)),
                { moment: "fizzle", tint: tint }, 18);
            done(action);
        }
    });
}
