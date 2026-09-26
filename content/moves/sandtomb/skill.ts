/**
 * 流沙地狱 / sandtomb 的出手方式。
 *
 * 核心念头：**在瞄准的可达地面预置一片短命流沙坑**。地面先裂开细沙 6 刻作预告，随后沙坑张开、沙粒朝坑心翻流；
 * 只有贴地、且脚踩在这层地面上的敌人会被拖住：从轻减速逐步加深，约 12 刻收紧到完全束缚，每 `interval` 磨一次、
 * 每一拍朝坑心收。离地、走出坑沿或地面被毁都立即解除；回到坑里重新渐陷，不叠永久状态。飞行、腾空天然免疫。
 *
 * 三幕：
 *   起（windup，提交前）：沿瞄准射线取真实可达地面，在原地先播 6 刻细沙裂纹，不生成追踪弹。
 *   张（execute）：提交后按该地面点张开流沙坑（`WorldEffects.field`，规则 `world_combat:sandtomb/pit` 由本单元注册），
 *       坑位置固定、可预放，表现绑在坑效果本身。
 *   陷（bond）：踏入的贴地非友方获得一份**每目标载体**——借共享身份 `world_combat:status/partiallytrapped`
 *       （本单元 `world_combat:sandtomb_grip`）并挂 `world_combat:sandtomb_bond` 托管效果；每 2 刻把目标朝坑心收、
 *       按陷入时间从轻到满减速，每 `interval` 磨一次。离地/出半径/地面被毁/外力清除即结束，只撤自己那份束缚。
 *
 * 与同族分开：它是四招里唯一面对真实地面的预置陷坑，固定有限、可空地预放；只吃贴地目标，腾空即脱身；
 * 不替换方块、不挖坑、不把实体硬压进实心地。
 */
namespace PokemonSkills {
    const sandtombScene = "world_combat:move_sandtomb";
    const sandtombGrip = "world_combat:sandtomb_grip";
    const sandtombBond = "world_combat:sandtomb_bond";
    const sandtombRule = "world_combat:sandtomb/pit";
    const sandtombPitKey = "sandtomb.pit";
    StatusContributions.define(sandtombGrip);
    const sandtombOpenText = "world_combat.move.sandtomb.text.swallow";
    const sandtombReleaseText = "world_combat.move.sandtomb.text.release";
    const sandtombSlipText = "world_combat.move.sandtomb.text.slip";

    function sandtombPoint(value: any): CombatPoint { return WorldCombat.point(value[0], value[1], value[2]); }

    /**
     * 脚是否真的踩在这层坑面上：脚部贴住坑面高度（0.12 格容差）、水平在半径内，并且脚下确有真实支撑面
     * （native grounded 对不移动的/被部署的身体常是陈旧值，所以用顶面探针核对真实方块；向上起跳或离支撑面 0.12 格即判离地）。
     */
    function sandtombTouches(world: CombatWorld, body: CombatObservation, x: number, y: number, z: number, radius: number): boolean {
        const foot = sandtombFoot(body);
        if (Math.abs(foot.y() - y) > .12 || body.velocity().y() > .02) return false;
        const dx = body.position().x() - x, dz = body.position().z() - z;
        if (Math.sqrt(dx * dx + dz * dz) > radius) return false;
        const under = SurfacePaths.support(world, WorldCombat.point(body.position().x(), foot.y(), body.position().z()), .06, .16);
        return under !== null && Math.abs(under.y() - y) <= .12 && Math.abs(under.y() - foot.y()) <= .12;
    }

    /** 脚部位置（碰撞箱底面中心）。 */
    function sandtombFoot(body: CombatObservation): CombatPoint {
        return WorldCombat.point(body.position().x(), body.boundsMin().y(), body.position().z());
    }

    function sandtombAir(id: string): boolean {
        return id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air";
    }

    /**
     * 沿瞄准方向取真实可达地面：先在 x/z 处用原生碰撞射线找“朝上的顶面”（SurfacePaths 走的是 clipBlocks），
     * 再从施法者到坑口上方探一条射线；墙或楼板挡住就返回 null——墙后不能凭准点生成。
     */
    function sandtombGround(world: CombatWorld, origin: CombatPoint, raw: CombatPoint): CombatPoint | null {
        const ground = SurfacePaths.support(world, raw, 1.5, 6);
        if (ground === null) return null;
        const probe = ground.plus(WorldCombat.point(0, 0.35, 0));
        const clip = world.clipBlocks(origin.plus(WorldCombat.point(0, 0.4, 0)), probe);
        if (clip === null || clip.blocked()) return null;
        return ground;
    }

    function sandtombBondData(json: string): string {
        const value = JSON.parse(json);
        if (!Array.isArray(value.point) || value.point.length !== 3) throw new Error("Invalid sand tomb pit");
        ["grind", "interval", "pull", "gripTicks", "radius", "grit", "duration", "entered", "next"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid sand tomb bond");
        });
        if (value.interval < 1 || value.radius <= 0 || value.gripTicks < 1 || value.duration < 1) throw new Error("Invalid sand tomb bond");
        return JSON.stringify(value);
    }

    /** 踏入或留在坑里：确保该目标由本条坑（本施法者）持有一份渐陷载体；已有就不重复挂。 */
    function sandtombStep(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        if (world.friendly(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        const gameplay = Math.max(0.6, Number(field.data.radius) || field.radius);
        if (!sandtombTouches(world, body, field.position[0], field.position[1], field.position[2], gameplay)) return;
        const centre = WorldCombat.point(field.position[0], field.position[1] + 0.4, field.position[2]);
        if (!world.clear(centre, sandtombFoot(body).plus(WorldCombat.point(0, .12, 0)))) return;
        const foot = sandtombFoot(body);
        const own = String(world.source().ref());
        // 同一场已有本施法者的载体就保留；重叠坑各持有自己的 field id 与贡献。
        const existing = world.effects(actor, sandtombBond);
        for (let i = 0; i < existing.length; i++) {
            if (String(existing[i].source().ref()) !== own) continue;
            let same = false;
            try { same = Number(JSON.parse(existing[i].data()).field) === Number(field.id); } catch (error) { same = false; }
            if (same) return;
        }
        const ticks = Math.max(20, Math.round(typeof field.remaining === "number" ? field.remaining : Number(field.data.duration) || 200));
        const state = { field: typeof field.id === "number" ? field.id : 0,
            point: [field.position[0], field.position[1], field.position[2]], radius: gameplay,
            grind: Number(field.data.grind) || 0, interval: Math.max(6, Math.round(Number(field.data.interval) || 22)),
            pull: 0, gripTicks: 12, grit: Math.max(8, Math.round(Number(field.data.grit) || 16)),
            duration: ticks, entered: world.tick(), next: world.tick() + Math.max(6, Math.round(Number(field.data.interval) || 22)),
            pulses: 0, slipped: false };
        world.effect(sandtombBond, actor, JSON.stringify(state), ticks);
        WorldFeedback.emit(world, sandtombScene, 1, foot,
            { moment: "sink", target: String(actor.ref()), radius: gameplay, grit: state.grit }, 18);
    }

    // Thin native body queries include tall bodies whose feet touch the pit. Each bond owns one field id.
    WorldEffects.fieldRule(sandtombRule, {
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = sandtombPoint(field.position);
            const support = SurfacePaths.support(world, centre, .06, .16);
            if (support === null || Math.abs(support.y() - centre.y()) > .12) { effect.end(); return; }
            const radius = Number(field.data.radius) || field.radius;
            const bodies = world.queryBox(centre.minus(WorldCombat.point(radius, .12, radius)),
                centre.plus(WorldCombat.point(radius, .15, radius)), false);
            for (let i = 0; i < bodies.length; i++) sandtombStep(world, bodies[i], field);
        }
    }, { identity: WorldEffects.identity("pit", "sandtomb"), lineOfSight: false });

    // 渐陷载体：挂在目标身上的独立托管效果，随目标或坑结束；只推、只磨，不把实体压进方块。
    WorldCombat.effect(sandtombBond, 1, 500, "actor", sandtombBondData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(sandtombBond, "start", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        if (!CombatStatus.apply(world, victim, "partiallytrapped", sandtombGrip, data.duration, 0, { unique: true })) { effect.end(); return; }
        const token = String(effect.id());
        if (!StatusContributions.upsert(world, victim, sandtombGrip, token, {}, data.duration,
            { owner: { id: effect.id(), definition: sandtombBond, target: String(victim.ref()) } })) { effect.end(); return; }
        const actual = withTarget(factContext(effect), victim);
        data.pull = Math.max(0, p("sandtomb", "pull", actual));
        data.gripTicks = Math.max(1, Math.round(p("sandtomb", "grip", actual)));
        effect.state(JSON.stringify(data));
        effect.schedule("beat", "beat", 1, "{}");
    });
    WorldCombat.effectHandler(sandtombBond, "beat", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        // 外力清掉了束缚身份：不再继续，按释放收尾。
        if (!StatusContributions.list(world, victim, sandtombGrip).some(item => item.token === String(effect.id()))
            || !world.effects(effect.source(), "world_combat:field").some(view => view.id() === data.field)) { effect.end(); return; }
        const foot = sandtombFoot(body);
        const anchor = sandtombPoint(data.point);
        // 离地、离开这层地面或走出坑沿：立即解除自己的束缚。
        if (!sandtombTouches(world, body, anchor.x(), anchor.y(), anchor.z(), data.radius)) {
            data.slipped = true; effect.state(JSON.stringify(data)); effect.end(); return;
        }
        const dx = body.position().x() - anchor.x(), dz = body.position().z() - anchor.z();
        const distance = Math.sqrt(dx * dx + dz * dz);
        const ramp = Math.min(1, Math.max(0, (world.tick() - data.entered) / Math.max(1, data.gripTicks)));
        world.attribute(victim, "minecraft:generic.movement_speed", -ramp, "add_multiplied_total");
        if (distance > 0.05 && data.pull > 0) {
            const step = Math.min(data.pull, distance);
            world.hitDisplace(victim, WorldCombat.point(-dx / distance * step, 0, -dz / distance * step));
        }
        // 同场同敌每个 interval 最多一次伤：只有真的结算到伤害才放命中反馈。
        if (world.tick() >= data.next) {
            data.next = world.tick() + Math.max(6, Math.round(data.interval));
            data.pulses = (data.pulses || 0) + 1;
            effect.state(JSON.stringify(data));
            const landed = hurt(world, victim, "sandtomb", data.grind, { damage: damageSpec("sandtomb", "grind") });
            if (!world.valid(victim)) { effect.end(); return; }
            if (landed) {
                const at = world.observe(victim);
                const where = at !== null ? at.position() : foot;
                WorldFeedback.emit(world, sandtombScene, 1, where,
                    { moment: "grind", target: String(victim.ref()), grit: Math.round(data.grit), count: Math.round(10 + data.grind),
                        intensity: Math.max(0.6, Math.min(2.2, data.grind / 24)), pulses: data.pulses }, 20);
                world.sound("minecraft:block.sand.break", where, 16, "{}");
            }
        }
        // 每目标沙圈随陷入时间升高：表现用同一份陷入进度，随载体结束一起收。
        WorldFeedback.onEffect(world, effect.id(), "sandtomb:bound:" + String(victim.ref()), sandtombScene, 1, foot,
            { moment: "bound", target: String(victim.ref()), depth: Math.round(ramp * 0.5 * 100) / 100,
                radius: data.radius, grit: Math.round(data.grit), scale: data.radius / 1.3, intensity: 0.6 + ramp * 0.9 });
        effect.schedule("beat", "beat", 2, "{}");
    });
    WorldCombat.effectHandler(sandtombBond, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (world.valid(victim) && world.valid(world.source()))
            StatusContributions.remove(world, victim, sandtombGrip, String(effect.id()));
        if (!world.valid(victim)) return;
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, sandtombScene, 1, body.position(),
            { moment: data.slipped ? "slip" : "release", target: String(victim.ref()), radius: data.radius }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)),
            data.slipped ? sandtombSlipText : sandtombReleaseText, [], 24);
    });
    WorldCombat.effectHandler(sandtombBond, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 束缚身份被外力清除（牛奶、/effect clear、被替换）后，对应的载体不再需要。
    WorldCombat.on("world_combat:move_sandtomb/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== sandtombGrip) return;
        const world = event.world(), victim = event.actor();
        if (!world.valid(victim) || MobEffects.read(world, victim, sandtombGrip) !== null) return;
        const bonds = world.effects(victim, sandtombBond);
        for (let i = 0; i < bonds.length; i++) world.operation(bonds[i].id(), "world_combat:dispel", "{}");
    });

    define({
        id: "sandtomb",
        name: "流沙地狱",
        description: "在瞄准的可达地面预置一片短命流沙坑：地面先裂开细沙预告，随后沙坑张开、沙粒朝坑心翻流。只有贴地、脚踩在这层地面上的敌人会被拖住——从轻减速逐步收紧，约 12 刻后完全被束缚，每一拍朝坑心收拢，每过片刻被沙砾磨一次。离地、跳出坑沿或地面被毁都会立即脱身；回到坑里要重新渐陷。可以预放空地，飞行或腾空的生物不受影响。沉陷式坑更久更黏但磨得轻；速陷式磨得更重、收得更快。",
        uses: ["提前把一片地面变成陷坑，封住走位", "把贴地的重目标拖住往坑心收", "用物理持续伤害磨厚目标", "让起跳或飞行成为对手唯一的选择"],
        kind: "aim",
        range: 10,
        maxRange: 17,
        prepare: 9,
        active: 20,
        recover: 9,
        cooldown: 42,
        style: "sandtomb",
        defaults: { deep: false, ai: { maxChase: 11, preferGrounded: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("sandtomb", "reach", pokemon), geometry: "line", style: "sandtomb", color: 0xC9A76A,
                label: config && config.deep === true ? "沉陷流沙" : "速陷流沙" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["sandtomb"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const deep = !!(config && config.deep);
            return {
                prepare: Math.round(p("sandtomb", "charge", context)),
                recover: 9,
                cooldown: Math.round(p("sandtomb", "duration", context) * 0.2) + 14 + (deep ? 8 : 0),
                active: skills["sandtomb"].active,
                range: p("sandtomb", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense();
            let raw: CombatPoint | null = null;
            try { raw = action.targetPosition(); } catch (error) { raw = null; }
            if (raw !== null) {
                const ground = sandtombGround(world, action.origin(), raw);
                if (ground !== null) {
                    action.data(sandtombPitKey, JSON.stringify({ x: ground.x(), y: ground.y(), z: ground.z() }));
                    const radius = Math.max(1.0, p("sandtomb", "radius", action));
                    action.present("sandtomb:crack", sandtombScene, 1, ground,
                        JSON.stringify({ moment: "charge", radius: radius, grit: Math.max(8, Math.round(p("sandtomb", "grit", action))), scale: radius / 1.3 }));
                }
            }
            return prepare;
        },
        execute: function (action, move, config, done) {
            action.releaseTarget();
            const world = action.world();
            const stored = action.data(sandtombPitKey);
            let ground: CombatPoint | null = null;
            if (stored !== null) { try { const value = JSON.parse(stored); ground = WorldCombat.point(value.x, value.y, value.z); } catch (error) { ground = null; } }
            ground = sandtombGround(world, action.origin(), ground || action.targetPosition());
            if (ground === null) {
                WorldFeedback.emit(world, sandtombScene, 1, action.targetPosition(), { moment: "miss" }, 18);
                done(action); return;
            }
            const radius = Math.max(1.0, p("sandtomb", "radius", action));
            const duration = Math.max(80, Math.round(p("sandtomb", "duration", action)));
            const grind = p("sandtomb", "grind", action);
            const interval = Math.max(6, Math.round(p("sandtomb", "interval", action)));
            const grit = Math.max(8, Math.round(p("sandtomb", "grit", action)));
            const scale = radius / 1.3;
            // The rule scans a thin native box itself; the shared field only supplies ownership and time.
            const field = WorldEffects.field(world, sandtombRule, ground, radius,
                { grind: grind, interval: interval, grit: grit, duration: duration, radius: radius }, duration);
            WorldFeedback.emit(world, sandtombScene, 1, ground,
                { moment: "open", radius: radius, grit: grit, scale: scale }, 20);
            WorldFeedback.onEffect(world, field, "sandtomb:pit", sandtombScene, 1, ground,
                { moment: "pit", radius: radius, grit: grit, flow: Math.round(30 + radius * 30), scale: scale });
            WorldFeedback.text(world, ground.plus(WorldCombat.point(0, 0.5, 0)), sandtombOpenText, [], 26);
            world.sound("minecraft:block.sand.break", ground, 16, "{}");
            done(action);
        }
    });
}
