/**
 * 血月 / bloodmoon —— 出手方式。
 *
 * 核心念头：施法者先凝神召出一轮赤红如血的满月悬在身前上方，再让满月把全身气势推成一道**粗直的月光束**，
 *   沿着提交时锁定的方向射出去：光束先打中最靠前的首敌，再沿同一条线穿透有限个后排敌人，被方块截住就停在那里。
 *   气势倾泻完之后会有一段**禁复窗口**：不能马上再次召月，但换成任何别的招式都会让气势提前平息。
 *   这是原生「无法连续使出2次」在即时战斗里的形状。
 *
 * 幕：
 *   起（raise/gather，提交前）：满月在身前上方升起、脚下月光向内汇聚（`action.present`，可打断、不花 PP）。
 *   束（beam，提交后）：月束从身前直射出去，首敌结算 `moonlight`，同线后排各自结算 `spill`。
 *   禁（spent）：施法者进入禁复窗口，身上留下标识；期间本招不可用，换招或等窗口走完即可再次召月。
 *
 * 选取 `kind: "aim"`：提交时锁方向，可朝任意阵营实体、方向或世界点发射；空放也照常射出月束并进入禁复状态。
 *   方块截束、不穿墙；不再从天而降、不在原地炸圈。攻击许可仍由命中层决定，AI 仍按仇恨推荐敌人。
 *
 * 与同族分开：月光束（moonblast）是短促点射、月之光（moonlight）是恢复技；只有血月是**身前一轮血月推出一道
 *   可穿透一排的粗月束**，形状与其余贯穿/直线招式不同。反制方式是横走出光束这条线，或用掩体截住它。
 */
namespace PokemonSkills {
    /** 满月悬在施法者身前上方多高、往前多远（几何常量）。 */
    const BLOODMOON_HEIGHT = 3.0;
    const BLOODMOON_FORWARD = 1.6;
    /** 禁复标识的托管效果：跟着施法者，窗口结束或被换招提前平息时一起收走。 */
    const bloodmoonSpentMark = "world_combat:bloodmoon_spent";

    WorldCombat.effect(bloodmoonSpentMark, 1, 400, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.ticks !== "number" || !isFinite(value.ticks) || value.ticks <= 0) throw new Error("Invalid bloodmoon spent: ticks");
        return JSON.stringify({ ticks: Math.round(value.ticks) });
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(bloodmoonSpentMark, "start", function (effect) { effect.schedule("watch", "watch", 1, "{}"); });
    WorldCombat.effectHandler(bloodmoonSpentMark, "watch", function (effect) {
        const state = JSON.parse(effect.state()), world = effect.world(), actor = effect.target();
        if (!world.valid(actor)) { effect.end(); return; }
        const native = NativeEffects.read(world, actor);
        const spent = String(native.used) === bloodmoonId && world.tick() - native.usedTick < state.ticks;
        // 换成别的招式或窗口走完，气势已平息，标识随实际过程收走。
        if (!spent) { effect.end(); return; }
        effect.schedule("watch", "watch", 2, "{}");
    });
    WorldCombat.effectHandler(bloodmoonSpentMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 禁复门禁：最近一次提交的就是本招、且还在 `spent` 窗口内时，本招不可用（对所有带身份记录的战斗者一致）。
     *  只作用于起手/提交；本次施放命中时的伤害阶段不再复查，否则刚提交的这一下会被自己顶回去。 */
    function bloodmoonSpent(context: CombatStatus.ActionPolicy): void {
        if (context.phase === "damage") return;
        if (String(context.actor.domain()) !== "cobblemon" || !context.world.valid(context.actor)) return;
        const state = NativeEffects.read(context.world, context.actor);
        if (String(state.used) !== bloodmoonId) return;
        const pokemon = CobblemonCombat.pokemon(context.actor);
        const ticks = Math.max(1, Math.round(p(bloodmoonId, "spent", { pokemon: pokemon, skill: skills[bloodmoonId],
            detail: { values: skills[bloodmoonId].defaults }, world: context.world, actor: context.actor })));
        if (context.world.tick() - state.usedTick < ticks) context.blocked["move-restricted"] = true;
    }

    define({
        id: bloodmoonId,
        cooldownParameter: "recharge",
        name: "Blood Moon",
        description: "召出一轮赤红如血的满月悬在身前，把全身气势推成一道粗直的月光束射出去：先打中最靠前的首敌，再沿同一条线穿透有限个后排敌人，被方块截住就停在那里。放完之后气势耗尽，短时间内不能再次召月——换成别的招式可以提前平息。月蚀式让月束更粗、穿透更多后排，代价是首敌威力略降。",
        uses: ["召出满月、让粗月束直射出去", "把排成一列的敌人一起穿透", "点杀远处的厚血目标"],
        kind: "aim",
        range: 11,
        maxRange: 16,
        prepare: 30,
        active: 0,
        recover: 14,
        cooldown: 40,
        style: "moon",
        defaults: { eclipse: false, ai: { maxChase: 16, minHealth: 0.25, crowd: false } },
        fields: [],
        eligibility: bloodmoonSpent,
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[bloodmoonId], detail: { values: config } };
            return {
                radius: p(bloodmoonId, "reach", context), geometry: "line", style: "moon", color: 0x8E2436,
                label: config && config.eclipse === true ? "血月·月蚀" : "血月·满月"
            };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[bloodmoonId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(bloodmoonId, "charge", context)),
                recover: Math.round(p(bloodmoonId, "recover", context)),
                cooldown: Math.round(p(bloodmoonId, "recharge", context)),
                active: 0,
                range: p(bloodmoonId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const motes = Math.max(10, Math.round(p(bloodmoonId, "motes", action)));
            const radius = p(bloodmoonId, "beamRadius", action);
            const eclipse = config && config.eclipse === true ? 1 : 0;
            const faced = WorldGeometry.flatUnit(action.direction());
            const moon = action.origin().plus(WorldCombat.point(0, BLOODMOON_HEIGHT, 0)).plus(faced.scale(BLOODMOON_FORWARD));
            action.present("bloodmoon:raise:moon:" + action.id(), bloodmoonScene, 1, moon,
                JSON.stringify({ moment: "raise", windup: prepare, motes: motes, scale: radius / 0.5, eclipse: eclipse }));
            action.present("bloodmoon:raise:gather:" + action.id(), bloodmoonScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, motes: motes, scale: radius / 0.5, eclipse: eclipse }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const eclipse = !!(config && config.eclipse === true);
            const moonlight = p(bloodmoonId, "moonlight", action);
            const spill = p(bloodmoonId, "spill", action);
            const reach = Math.max(2, action.range());
            const beamRadius = Math.max(0.3, p(bloodmoonId, "beamRadius", action));
            const pierce = Math.max(0, Math.round(p(bloodmoonId, "pierce", action)));
            const motes = Math.max(10, Math.round(p(bloodmoonId, "motes", action)));
            const spentTicks = Math.max(1, Math.round(p(bloodmoonId, "spent", action)));
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const casterAt = self.position();
            // 提交那刻锁死方向：对手横走出这条线就只看着月束从旁边过去。
            const aimed = aim(action);
            const flat = WorldCombat.point(aimed.x(), 0, aimed.z());
            const direction = flat.length() < 0.001 ? WorldGeometry.flatUnit(action.direction()) : flat.unit();
            action.releaseTarget();
            const beamStart = casterAt.plus(WorldCombat.point(0, 0.5, 0)).plus(direction.scale(0.5));
            const moon = casterAt.plus(WorldCombat.point(0, BLOODMOON_HEIGHT, 0)).plus(direction.scale(BLOODMOON_FORWARD));
            // 方块截束：粗直月束撞到墙就停在那里，不穿墙。
            const endpoint = beamStart.plus(direction.scale(reach));
            const clip = world.clipBlocks(beamStart, endpoint);
            const wall = clip !== null && clip.blocked();
            const beamEnd = wall ? clip!.position() : endpoint;
            const beamLength = Math.max(0.5, beamEnd.minus(beamStart).length());
            const scale = beamRadius / 0.5;
            const intensity = Math.max(0.6, Math.min(2.4, moonlight / 140));

            // 沿同一条线取样：按到光束起点的投影排序，最靠前的首敌先结算，其余后排吃 spill。
            const candidates: { actor: CombatActor; along: number; point: CombatPoint }[] = [];
            WorldGeometry.selectEnemies(world, WorldGeometry.lane(beamStart, direction, beamLength, beamRadius, { below: 1.7, above: 1.7 }),
                function (victim, facts) {
                    const at = facts.position();
                    const along = (at.x() - beamStart.x()) * direction.x() + (at.z() - beamStart.z()) * direction.z();
                    if (along < 0.3) return;
                    candidates.push({ actor: victim, along: along, point: at });
                });
            candidates.sort(function (left, right) { return left.along - right.along; });
            const primary = candidates.length > 0 ? candidates[0] : null;
            const follow = candidates.slice(1, 1 + pierce);

            sound(action, "minecraft:block.beacon.activate");
            WorldFeedback.emit(world, bloodmoonScene, 1, moon,
                { moment: "moon", motes: motes, scale: scale, intensity: intensity, eclipse: eclipse ? 1 : 0 }, 40);
            WorldFeedback.emit(world, bloodmoonScene, 1, beamStart,
                { moment: "beam", path: [[beamStart.x(), beamStart.y(), beamStart.z()], [beamEnd.x(), beamEnd.y(), beamEnd.z()]],
                    motes: motes, radius: beamRadius, scale: scale, intensity: intensity, eclipse: eclipse ? 1 : 0, wall: wall ? 1 : 0 }, 34);

            let primaryHit = false, extras = 0;
            if (primary !== null && hurt(action, primary.actor, bloodmoonId, moonlight, { damage: damageSpec(bloodmoonId, "moonlight") })) {
                primaryHit = true;
                WorldFeedback.emit(world, bloodmoonScene, 1, primary.point,
                    { moment: "impact", point: [primary.point.x(), primary.point.y(), primary.point.z()], target: String(primary.actor.ref()),
                        motes: motes, radius: beamRadius, scale: scale, intensity: intensity }, 28);
            }
            for (let index = 0; index < follow.length; index++) {
                const victim = follow[index];
                if (!hurt(action, victim.actor, bloodmoonId, spill, { damage: damageSpec(bloodmoonId, "spill") })) continue;
                extras++;
                WorldFeedback.emit(world, bloodmoonScene, 1, victim.point,
                    { moment: "spill", point: [victim.point.x(), victim.point.y(), victim.point.z()], target: String(victim.actor.ref()),
                        motes: Math.round(motes * 0.6), radius: beamRadius, scale: scale, intensity: Math.max(0.5, intensity * 0.7) }, 28);
            }
            if (!primaryHit && extras === 0) {
                const at = wall ? beamEnd : endpoint;
                WorldFeedback.emit(world, bloodmoonScene, 1, at,
                    { moment: "miss", point: [at.x(), at.y(), at.z()], motes: Math.round(motes * 0.6), radius: beamRadius, scale: scale, wall: wall ? 1 : 0 }, 22);
            }
            WorldFeedback.text(world, casterAt.plus(WorldCombat.point(0, 1.3, 0)), bloodmoonFallText,
                [Math.round(moonlight), extras], 30);
            world.sound("cobblemon:impact.normal", beamStart, 16, "{}");

            // 禁复标识绑在实际窗口上：换招提前平息或窗口走完，标识一起收走。
            world.effects(actor, bloodmoonSpentMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
            const mark = world.effect(bloodmoonSpentMark, actor, JSON.stringify({ ticks: spentTicks }), spentTicks);
            if (mark > 0) {
                WorldFeedback.onEffect(world, mark, "bloodmoon:spent", bloodmoonScene, 1, casterAt,
                    { moment: "spent", target: String(actor.ref()), motes: motes, scale: scale, linger: spentTicks, seconds: Math.round(spentTicks / 20) });
                WorldFeedback.text(world, casterAt.plus(WorldCombat.point(0, 1.6, 0)), bloodmoonSpentText, [Math.round(spentTicks / 20)], 30);
            }
            done(action);
        }
    });
}
