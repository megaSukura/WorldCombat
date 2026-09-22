/**
 * 疯狂植物 / frenzyplant 的出手方式。
 *
 * 核心念头：把生长灌进选定的那块地，巨大的树根自地面窜起、抽打站在那里的对手；缠根还会把他们按在原地。
 * 根须褪去后，那片地短暂留下苔藓与生根土——这一招在世界里真的长出过东西。放完施法者力竭一段时间。
 *
 * 四幕：
 *   起：选定地面下陷、土屑上冒，根须将出的预告（windup，提交前）。
 *   窜：提交后根须自落点窜起一圈（erupt），高过人头。
 *   抽：根须抽下，圈内每个敌人各挨一记 `bloom`；缠根开启时命中者被 `rooted` 按在原地 (slam / snare)。
 *   留：根须褪去，那块地留下苔藓与生根土一段时间（leaves），随后施法者挂上 mustrecharge 力竭。
 *
 * 「无法行动」由 CombatStatus.actions 门禁实现；「无法移动」由效果自带的速度归零与 rooted 补上。
 */
namespace PokemonSkills {
    const frenzyplantScene = "world_combat:move_frenzyplant";
    const frenzyplantSpentEffect = "world_combat:frenzyplant_spent";
    const frenzyplantHitText = "world_combat.move.frenzyplant.text.hit";
    const frenzyplantSnareText = "world_combat.move.frenzyplant.text.snare";
    const frenzyplantSpentText = "world_combat.move.frenzyplant.text.spent";
    const frenzyplantMissText = "world_combat.move.frenzyplant.text.miss";

    /** 把落点周围的表层地面换成苔藓与生根土，留下一片根须褪去后的痕迹；到期原方块回来。 */
    function frenzyplantBlossom(world: CombatWorld, point: CombatPoint, radius: number, ticks: number): void {
        const cells: any[] = [];
        const r = Math.ceil(radius), px = point.x(), py = point.y(), pz = point.z();
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > radius) continue;
            const x = Math.floor(px) + dx, z = Math.floor(pz) + dz;
            for (let dy = 0; dy >= -3; dy--) {
                const y = Math.floor(py) + dy;
                const block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                const surface = distance <= radius * 0.5 ? "minecraft:moss_block" : "minecraft:rooted_dirt";
                if (id !== surface) cells.push({ x: x, y: y, z: z, block: surface });
                break;
            }
        }
        if (!cells.length) return;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return; }
    }

    /** 根须褪去：挂上力竭状态（共享身份 mustrecharge）并停步，播放收场表现与浮字。 */
    function frenzyplantSpent(action: CombatAction, ticks: number, hits: number, intensity: number): void {
        const world = action.world();
        MobEffects.apply(world, action.actor(), frenzyplantSpentEffect, ticks, 0);
        WorldEffects.apply(world, action.actor(), "rooted", {}, ticks);
        world.stopMovement(action.actor());
        const body = world.observe(action.actor());
        if (body !== null) {
            WorldFeedback.emit(world, frenzyplantScene, 1, body.position(),
                { moment: "spent", scale: intensity, seconds: ticks / 20, hits: hits, count: Math.round(8 + (ticks / 20) * 5) }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), frenzyplantSpentText,
                [Math.round(ticks / 20 * 10) / 10], 30);
        }
        sound(action, "cobblemon:impact.grass");
    }

    define({
        id: "frenzyplant",
        name: "Frenzy Plant",
        description: "The user slams the target with the roots of an enormous tree. The user can't move on the next turn.",
        uses: ["从地面窜出的巨木根须", "同时抽打挤在一块地上的对手", "把目标按在原地再交给自己队友"],
        kind: "point",
        range: 10,
        maxRange: 18,
        prepare: 12,
        active: 26,
        recover: 10,
        cooldown: 74,
        style: "growth",
        stationary: true,
        defaults: { grip: false, ai: { minTargets: 1, minHealth: 0.35 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("frenzyplant", "radius", pokemon), geometry: "area", style: "growth", color: 0x7FB04A, label: "疯狂植物" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["frenzyplant"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("frenzyplant", "charge", context)),
                recover: 10,
                cooldown: Math.round(p("frenzyplant", "exhaust", context)) + 16,
                range: p("frenzyplant", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const point = action.targetPosition();
            action.present("world_combat:move_frenzyplant:windup", frenzyplantScene, 1, point,
                JSON.stringify({ moment: "windup", windup: prepare, grip: !!(config && config.grip),
                    point: [point.x(), point.y(), point.z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const point = action.targetPosition();
            const radius = p("frenzyplant", "radius", action);
            const power = p("frenzyplant", "bloom", action);
            const rise = p("frenzyplant", "rise", action);
            const snare = Math.max(0, Math.round(p("frenzyplant", "snareTicks", action)));
            const leaves = Math.max(20, Math.round(p("frenzyplant", "leaves", action)));
            const base = Math.max(1, Math.round(p("frenzyplant", "exhaust", action)));
            const grip = !!(config && config.grip);
            const scale = radius / 2.4;
            const intensity = Math.max(0.6, Math.min(2.6, power / 150));
            let hits = 0, snares = 0;

            sound(action, "cobblemon:move.leafstorm.actor");
            WorldFeedback.emit(world, frenzyplantScene, 1, point,
                { moment: "erupt", scale: scale, intensity: intensity, radius: radius, rise: rise,
                    count: Math.round(60 + power * 0.8) }, 30);

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(point, 0, radius, { below: 2.5, above: 3 }), function (enemy, facts) {
                const landed = hurt(action, enemy, "frenzyplant", power, { damage: damageSpec("frenzyplant", "bloom") });
                if (!landed) return;
                hits++;
                WorldFeedback.emit(world, frenzyplantScene, 1, facts.position(),
                    { moment: "slam", target: String(enemy.ref()), scale: scale, intensity: intensity,
                        notes: Math.round(14 + power * 0.3) }, 26);
                if (grip && snare > 0 && world.valid(enemy) && WorldEffects.apply(world, enemy, "rooted", {}, snare) > 0) {
                    snares = snares + 1;
                    WorldFeedback.emit(world, frenzyplantScene, 1, facts.position(), { moment: "snare", target: String(enemy.ref()), seconds: snare / 20 }, 24);
                }
            });

            frenzyplantBlossom(world, point, radius, leaves);
            WorldFeedback.emit(world, frenzyplantScene, 1, point,
                { moment: "leaves", scale: scale, radius: radius, seconds: leaves / 20, hits: hits }, 40);

            if (hits > 0) {
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.2, 0)), frenzyplantHitText, [hits], 28);
                if (snares > 0) WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.8, 0)), frenzyplantSnareText, [snares, Math.round(snare / 20 * 10) / 10], 28);
                sound(action, "cobblemon:move.leafstorm.target");
            } else {
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.2, 0)), frenzyplantMissText, [], 24);
            }

            frenzyplantSpent(action, base, hits, intensity);
            done(action);
        }
    });

    // 力竭的共享身份门禁：带着 mustrecharge 的人在窗口内不能开始新动作；伤害阶段不受影响。
    CombatStatus.actions.define({ id: "world_combat:frenzyplant/exhaust-gate", applies: function (context) { return context.phase !== "damage"; }, apply: function (context) {
        if (CombatStatus.has(context.world, context.actor, "mustrecharge")) context.blocked.exhausted = true;
    } });

    // 力竭挂上的一刻立刻停步，避免带着残余动量滑出去。
    WorldCombat.on("world_combat:move_frenzyplant/exhaust-halt", "world_combat:mob_effect_added", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== frenzyplantSpentEffect) return;
        event.world().stopMovement(event.actor());
    });

    // 力竭期间把导航速度归零：让「无法移动」对所有活体（含宝可梦的脚本导航）成立。
    WorldCombat.on("world_combat:move_frenzyplant/roots", "world_combat:navigate", "", function (event) {
        if (event.world().mobEffect(event.actor(), frenzyplantSpentEffect) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    // 力竭期间维持低密度的落叶与土屑：少而稳，靠近脚边，让玩家看清目标。
    WorldCombat.on("world_combat:move_frenzyplant/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== frenzyplantSpentEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_frenzyplant/recharge/" + String(actor.ref()), frenzyplantScene, 1,
            body.position(), { moment: "recharge", target: String(actor.ref()) }, 40);
    });
}
