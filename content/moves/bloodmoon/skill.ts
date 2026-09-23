/**
 * 血月 / bloodmoon —— 出手方式。
 *
 * 核心念头：施法者先凝神召出一轮赤红如血的满月悬在头顶，再让满月把全身气势化作一道**垂直落下的光柱**，
 *   砸在对手所在的地面上，四周留下一圈焦痕。气势倾泻完之后会有一段**禁复窗口**：不能马上再次召月，
 *   但换成任何别的招式都会让气势提前平息。这是原生「无法连续使出2次」在即时战斗里的形状。
 *
 * 幕：
 *   起（raise，提交前）：满月在头顶升起、脚下月光向内汇聚（`action.present`，可打断、不花 PP、不扣 PP）。
 *   落（fall，提交后）：月柱从天上的满月垂落到目标所站的地面，主目标结算 `moonlight`；月蚀式下落点内其他非友方
 *       再结算 `spill`。
 *   痕（scorch）：落点的地表被砸成焦土（`terrain` 租借、`linger` 活过招式本身、到期原方块回来）。
 *   禁（spent）：施法者进入禁复窗口，期间本招不可用；用别的招式或等窗口走完即可再次召月。
 *
 * 与同族分开：月光束（moonblast）是从身体射出的直线光束、月之光（moonlight）是恢复技；只有血月是**天上一轮血月＋
 *   地上一道垂落光柱**，形状与其余贯穿/直线招式完全不同。反制方式是盯住地面标记提前离开落点，或利用起手的空当打断。
 */
namespace PokemonSkills {
    /** 血月悬在施法者头顶多高（几何常量）。 */
    const BLOODMOON_HEIGHT = 9;

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

    /** 只有松软的地表会被砸成焦土：草、土、沙、雪一类；石质地面只留粒子焦痕。 */
    function bloodmoonScorched(id: string): boolean {
        return id.indexOf("grass_block") >= 0 || id.indexOf("dirt") >= 0 || id.indexOf("podzol") >= 0
            || id.indexOf("mycelium") >= 0 || id.indexOf("sand") >= 0 || id.indexOf("gravel") >= 0
            || id.indexOf("snow") >= 0 || id.indexOf("moss") >= 0 || id.indexOf("mud") >= 0
            || id.indexOf("clay") >= 0 || id.indexOf("farmland") >= 0;
    }

    /** 把落点那层地表换成焦土；实体占着的格子由宿主等它走开再合上，到期原方块回来。 */
    function bloodmoonScorch(scope: CombatWorld, centre: CombatPoint, radius: number, ticks: number): void {
        const cells: any[] = [], cx = Math.floor(centre.x()), cy = Math.floor(centre.y()), cz = Math.floor(centre.z());
        const limit = radius * radius;
        for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
            for (let dz = -Math.ceil(radius); dz <= Math.ceil(radius); dz++) {
                if (dx * dx + dz * dz > limit) continue;
                for (let dy = 0; dy >= -3; dy--) {
                    const block = scope.block(WorldCombat.point(cx + dx, cy + dy, cz + dz));
                    if (block === null) break;
                    const id = String(block.id());
                    if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                    if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
                    if (!bloodmoonScorched(id)) break;
                    cells.push({ x: cx + dx, y: cy + dy, z: cz + dz, block: "minecraft:coarse_dirt" });
                    break;
                }
            }
        }
        if (!cells.length) return;
        try { scope.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { }
    }

    define({
        id: bloodmoonId,
        cooldownParameter: "recharge",
        name: "Blood Moon",
        description: "The user unleashes the full brunt of its spirit from a full moon that shines as red as blood. This move can't be used twice in a row.",
        uses: ["召出满月、让月柱从天上垂直砸落", "点杀远处的厚血目标", "用月蚀式把落点一圈一起砸进去"],
        kind: "enemy",
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
                radius: p(bloodmoonId, "radius", context), geometry: "area", style: "moon", color: 0x8E2436,
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
            const radius = p(bloodmoonId, "radius", action);
            const eclipse = config && config.eclipse === true ? 1 : 0;
            const moon = action.origin().plus(WorldCombat.point(0, BLOODMOON_HEIGHT, 0));
            action.present("bloodmoon:raise:moon:" + action.id(), bloodmoonScene, 1, moon,
                JSON.stringify({ moment: "raise", windup: prepare, motes: motes, scale: radius / 2.0, eclipse: eclipse }));
            action.present("bloodmoon:raise:gather:" + action.id(), bloodmoonScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, motes: motes, scale: radius / 2.0, eclipse: eclipse }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const eclipse = !!(config && config.eclipse === true);
            const moonlight = p(bloodmoonId, "moonlight", action);
            const spill = eclipse ? p(bloodmoonId, "spill", action) : 0;
            const radius = Math.max(1, p(bloodmoonId, "radius", action));
            const motes = Math.max(10, Math.round(p(bloodmoonId, "motes", action)));
            const scorchTicks = Math.max(40, Math.round(p(bloodmoonId, "scorch", action)));
            const self = world.observe(actor);
            const casterAt = self === null ? action.origin() : self.position();
            const moon = casterAt.plus(WorldCombat.point(0, BLOODMOON_HEIGHT, 0));
            const body = target !== null && world.valid(target) && !world.friendly(target) ? world.observe(target) : null;
            const scale = radius / 2.0;
            const intensity = Math.max(0.6, Math.min(2.4, moonlight / 140));
            const state = { moon: moon, ground: casterAt, scale: scale, intensity: intensity, motes: motes, eclipse: eclipse ? 1 : 0 };

            if (body === null) {
                WorldFeedback.emit(world, bloodmoonScene, 1, moon, { moment: "fizzle", motes: motes, scale: scale }, 24);
                done(action);
                return;
            }
            const targetRef = String(target!.ref());
            const ground = body.position();
            state.ground = ground;
            sound(action, "minecraft:block.beacon.activate");
            WorldFeedback.emit(world, bloodmoonScene, 1, moon,
                { moment: "moon", motes: motes, scale: scale, intensity: intensity, eclipse: eclipse ? 1 : 0 }, 46);
            WorldFeedback.emit(world, bloodmoonScene, 1, ground,
                { moment: "fall", path: [[moon.x(), moon.y(), moon.z()], [ground.x(), ground.y(), ground.z()]],
                    motes: motes, radius: radius, scale: scale, intensity: intensity, eclipse: eclipse ? 1 : 0 }, 34);

            let primary = false, extra = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(ground, 0, radius, { below: 1.6, above: 2.8 }),
                function (victim, facts) {
                    const isPrimary = String(victim.ref()) === targetRef;
                    const power = isPrimary ? moonlight : spill;
                    if (power <= 0) return;
                    const segment = isPrimary ? "moonlight" : "spill";
                    if (!hurt(action, victim, bloodmoonId, power, { damage: damageSpec(bloodmoonId, segment) })) return;
                    const at = world.observe(victim);
                    const point = at === null ? facts.position() : at.position();
                    if (isPrimary) { primary = true; }
                    else extra++;
                    WorldFeedback.emit(world, bloodmoonScene, 1, point,
                        { moment: isPrimary ? "impact" : "spill", target: String(victim.ref()), motes: isPrimary ? motes : Math.round(motes * 0.6),
                            radius: radius, scale: scale, intensity: isPrimary ? intensity : Math.max(0.5, intensity * 0.7) }, 28);
                });

            bloodmoonScorch(world, ground, radius, scorchTicks);
            WorldFeedback.emit(world, bloodmoonScene, 1, ground,
                { moment: primary ? "mark" : "miss", target: targetRef, motes: motes, radius: radius, scale: scale,
                    intensity: intensity, extra: extra, scorch: scorchTicks }, 30);
            WorldFeedback.text(world, ground.plus(WorldCombat.point(0, 1.2, 0)), bloodmoonFallText,
                [Math.round(moonlight), Math.round(scorchTicks / 20)], 30);
            world.sound("cobblemon:impact.normal", ground, 16, "{}");
            world.sound("minecraft:entity.generic.explode", ground, 12, "{}");
            done(action);
        }
    });
}
