/**
 * 浊流 / muddywater 的出手方式。
 *
 * 核心念头：**一道贴地向前推的浑浊泥浪**。它不快，但很阔：泥水从脚下整片漫出去，一层层扫过身前，
 *   把扇形里所有敌人的视线一起糊住；推完，扫过的地面淤上一层泥。它区别于同族水招的地方就是这条
 *   「宽而低、单向推进的泥面」——冲浪是整圈水漫、水枪是细线、泡沫光线是黏人的泡沫球。
 *
 * 三幕：
 *   起（windup，提交前）：口边与脚边涌起一圈浑水、泥泡向内收，只播预告（可被打断）。
 *   漫（surge → hit）：提交后泥浪从脚下按 `sweep` 步向 `reach` 推进；每一步扫过一道扇环，环内每个
 *       非友方（最多 `maxTargets` 个）各吃一次 `surge`，有 `murkChance` 概率掉 `murkStages` 级命中并
 *       带上共享身份 `world_combat:status/murky`；泥浪会沿准线越过目标继续铺。
 *   淤（silt / miss）：浪推完，扫过的地面租借成 `minecraft:mud`（`siltTicks` 后原方块回来）；
 *       一个人都没扫到时播一个空浪。
 *
 * 与同族分开：唯一一条**贴地、单向、按步推进的宽泥浪**；画面上是低矮的褐色水墙向前抹，不是整圈、不是细线、
 *   不是会浮起的泡。命中下降走共享能力等级（NativeEffects.boost 的 accuracy）落到原生命中等级，
 *   同时挂真实 MobEffect（身份 murky + 伞身份 aim_impaired），对其他战斗者落到攻击变弱。
 */
namespace PokemonSkills {
    /** 把瞄准方向压到水平面；泥浪沿地面推出去。 */
    function muddywaterHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 扇环多边形：内弧 + 外弧围出的那段泥浪带，判定（sector∩ring）与表现（polygon）读同一片区域。 */
    function muddywaterBand(origin: CombatPoint, heading: CombatPoint, inner: number, outer: number, degrees: number): number[][] {
        const base = Math.atan2(heading.z(), heading.x());
        const half = (degrees * Math.PI / 180) / 2, steps = 8;
        const innerRadius = Math.max(0, inner), outerRadius = Math.max(innerRadius + 0.05, outer);
        const vertices: number[][] = [];
        for (let i = 0; i <= steps; i++) {
            const angle = base - half + 2 * half * (i / steps);
            vertices.push([origin.x() + Math.cos(angle) * innerRadius, origin.y(), origin.z() + Math.sin(angle) * innerRadius]);
        }
        for (let i = steps; i >= 0; i--) {
            const angle = base - half + 2 * half * (i / steps);
            vertices.push([origin.x() + Math.cos(angle) * outerRadius, origin.y(), origin.z() + Math.sin(angle) * outerRadius]);
        }
        return vertices;
    }

    /** 泥可以淤住的表层：软土、沙砾与非空气的硬地面都换成泥；水、岩浆、基岩不碰。 */
    function muddywaterSoil(id: string): boolean {
        if (id === "" || id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") return false;
        if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") return false;
        return id !== "minecraft:mud";
    }

    /** 在扇形扫过的地面上把最上面那层实心方块租借成泥；到期原方块回来，活物站在格子里时等它走开再合上。 */
    function muddywaterSilt(world: CombatWorld, origin: CombatPoint, heading: CombatPoint, reach: number, degrees: number, ticks: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = {};
        const base = Math.atan2(heading.z(), heading.x()), half = degrees * Math.PI / 360;
        const r = Math.ceil(reach), bx = Math.floor(origin.x()), by = Math.floor(origin.y()), bz = Math.floor(origin.z());
        for (let dx = -r; dx <= r && cells.length < 90; dx++) for (let dz = -r; dz <= r && cells.length < 90; dz++) {
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > reach || distance < 0.6) continue;
            const angle = Math.atan2(dz, dx), delta = Math.abs(angle - base);
            if (Math.min(delta, Math.PI * 2 - delta) > half) continue;
            const key = dx + ":" + dz;
            if (seen[key]) continue;
            seen[key] = true;
            const x = bx + dx, z = bz + dz;
            for (let dy = 1; dy >= -3; dy--) {
                const y = by + dy, block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (muddywaterSoil(id)) cells.push({ x: x, y: y, z: z, block: "minecraft:mud" });
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: muddywaterId,
        cooldownParameter: "recharge",
        name: "Muddy Water",
        description: "从脚下向前推出一道贴地的浑浊泥浪：泥水一层层漫过身前大片，扇形里的敌人各挨一记，有概率被泥水糊住眼睛、掉命中，还会沿准线越过目标继续铺；推完地面淤上一层泥。淤积式铺得更宽更久更黏，急流式更重更快更远。",
        uses: ["一次糊住身前扇形里的一排敌人", "削掉对手的命中，为对手的下一轮攻击留出空门", "在泥地上留下痕迹，标记这招扫过的地方"],
        kind: "enemy",
        range: 11,
        maxRange: 16,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 44,
        style: "mudwater",
        defaults: { silted: false, ai: { maxChase: 15, preferCrowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(muddywaterId, "reach", pokemon), geometry: "cone", style: "mudwater",
                color: 0x6B5A3E, label: config && config.silted === true ? "浊流·淤积" : "浊流" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[muddywaterId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(muddywaterId, "tempo", context)),
                recover: Math.round(p(muddywaterId, "aftercast", context)),
                cooldown: Math.round(p(muddywaterId, "recharge", context)),
                active: 0,
                range: p(muddywaterId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("muddywater:gather", muddywaterScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", drops: Math.round(p(muddywaterId, "drops", action)),
                    silted: config && config.silted === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position().plus(WorldCombat.point(0, body.height() * 0.25, 0));
            const heading = muddywaterHeading(aim(action));
            const power = p(muddywaterId, "surge", action);
            const reach = Math.max(4, p(muddywaterId, "reach", action));
            const span = Math.max(35, p(muddywaterId, "span", action));
            const steps = Math.max(3, Math.round(p(muddywaterId, "sweep", action)));
            const stages = Math.max(1, Math.min(2, Math.round(p(muddywaterId, "murkStages", action))));
            const chance = Math.max(0.05, Math.min(0.85, p(muddywaterId, "murkChance", action)));
            const murk = Math.max(40, Math.round(p(muddywaterId, "murkTicks", action)));
            const cap = Math.max(1, Math.round(p(muddywaterId, "maxTargets", action)));
            const drops = Math.max(10, Math.round(p(muddywaterId, "drops", action)));
            const siltTicks = Math.max(40, Math.round(p(muddywaterId, "siltTicks", action)));
            const silted = !!(config && config.silted);
            const scale = Math.max(0.5, Math.min(2.2, reach / 11));
            const intensity = Math.max(0.5, Math.min(2.2, power / 90));
            const struck: { [ref: string]: boolean } = {};
            let step = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const placed = muddywaterSilt(scope, origin, heading, reach, span, siltTicks);
                WorldFeedback.emit(scope, muddywaterScene, 1, origin,
                    { moment: hits > 0 ? "silt" : "miss", radius: reach, span: span, cells: placed, drops: drops, scale: scale,
                        path: muddywaterBand(origin, heading, 0, reach, span) }, 30);
                if (hits === 0)
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 0.9, 0)), muddywaterMissText, [], 24);
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const outer = reach * (step + 1) / steps, inner = Math.max(0, reach * step / steps - 0.35);
                const wedge = WorldGeometry.sector(origin, heading, outer, span, { below: 2.2, above: 2.0 });
                const annulus = WorldGeometry.ring(origin, inner, outer, { below: 2.2, above: 2.0 });
                const region: WorldGeometry.Region = {
                    contains: function (point) { return wedge.contains(point) && annulus.contains(point); },
                    centre: function () { return origin; },
                    radius: function () { return annulus.radius(); }
                };
                WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(actor.ref()) || struck[ref] || hits >= cap) return;
                    struck[ref] = true;
                    if (!hurt(current, enemy, muddywaterId, power, { damage: damageSpec(muddywaterId, "surge") })) return;
                    hits++;
                    let murked = false;
                    if (scope.valid(enemy) && scope.random() < chance) {
                        murked = true;
                        NativeEffects.boost(scope, enemy, "accuracy", -stages);
                        MobEffects.apply(scope, enemy, muddywaterEffect, murk, 0);
                    }
                    WorldFeedback.emit(scope, muddywaterScene, 1, facts.position(),
                        { moment: "hit", target: ref, stages: stages, murked: murked ? 1 : 0,
                            drops: drops, intensity: intensity, scale: scale }, 26);
                    if (murked)
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.15, 0)), muddywaterMurkText, [stages], 32);
                });
                WorldFeedback.keep(scope, "muddywater:front:" + action.id(), muddywaterScene, 1, origin,
                    { moment: "surge", front: outer, inner: inner, radius: reach, span: span,
                        path: muddywaterBand(origin, heading, inner, outer, span), drops: drops,
                        scale: scale, intensity: intensity, silted: silted ? 1 : 0 }, 14);
                step++;
                if (step >= steps) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "cobblemon:move.waterpulse.actor");
            WorldFeedback.emit(world, muddywaterScene, 1, origin,
                { moment: "surge", front: 0, inner: 0, radius: reach, span: span,
                    path: muddywaterBand(origin, heading, 0, 0.6, span), drops: drops, scale: scale,
                    intensity: intensity, silted: silted ? 1 : 0 }, 20);
            advance(action);
        }
    });

    // 泥水糊眼自然干去（或被牛奶、/effect clear 解除）：在目标身上补一记抹眼，让糊眼有明确的结束。
    WorldCombat.on("world_combat:move_muddywater/clear", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== muddywaterEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, muddywaterScene, 1, body.position(),
            { moment: "clear", target: String(actor.ref()), cause: String(data.cause || "") }, 18);
    });

    // 糊眼存续期间，目标头顶维持一圈缓慢下坠的泥点：少而稳，让出本体视线。
    WorldCombat.on("world_combat:move_muddywater/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== muddywaterEffect || event.world().tick() % 12 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "muddywater:murk:" + String(actor.ref()), muddywaterScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), drops: 10 }, 40);
    });
}
