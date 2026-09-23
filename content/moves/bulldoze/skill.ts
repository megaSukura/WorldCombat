/**
 * 重踏 / bulldoze 的出手方式。
 *
 * 核心念头：把全身的重量砸进地面，一圈地裂贴着地表往外推——只走地面，所以站在空中的人不会被扫到；
 * 被波沿扫过脚底的人站不稳，速度被压下去。它是一招覆盖，圈里的人都吃，深踏式收窄而更重。
 *
 * 三幕：
 *   起（windup，提交前）：抬脚、脚边卷起一圈石屑的预告。
 *   击（slam → wave → hit）：提交后重踏落地，地裂从脚下沿地表一圈圈向外推进；
 *       每一圈扫到的、站在地上的敌人各挨一记，速度下降 `snareStages` 级并被向外震开一点。
 *   痕（crack）：推到最后，脚下与四周的地表留下裂痕，停留一会儿后原方块回来。
 *
 * 配置 `deep`（深踏式）由 resolve 改时序、由公式改半径与威力：开启＝窄而重，关闭＝广而轻。
 *
 * 只命中 `facts.grounded()` 的目标；空中的目标安全，这是这招可被读出的反制。
 */
namespace PokemonSkills {
    const bulldozeScene = "world_combat:move_bulldoze";
    const bulldozeHitText = "world_combat.move.bulldoze.text.hit";
    const bulldozeMissText = "world_combat.move.bulldoze.text.miss";

    /** 地表的裂开形态：泥土类踏成粗土，石头类踏裂成圆石，沙地踏成砂岩；其余不动。 */
    function bulldozeCracked(id: string): string {
        if (id === "minecraft:grass_block" || id === "minecraft:dirt" || id === "minecraft:coarse_dirt" ||
            id === "minecraft:podzol" || id === "minecraft:rooted_dirt" || id === "minecraft:moss_block") return "minecraft:coarse_dirt";
        if (id === "minecraft:stone" || id === "minecraft:granite" || id === "minecraft:diorite" ||
            id === "minecraft:andesite" || id === "minecraft:tuff" || id === "minecraft:deepslate" ||
            id === "minecraft:gravel") return "minecraft:cobblestone";
        if (id === "minecraft:sand" || id === "minecraft:red_sand") return "minecraft:sandstone";
        return "";
    }

    /** 把落点周围的表层踏裂；只动地表的可换方块，到期原方块回来。 */
    function bulldozeScar(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, cap: number): number {
        var cells: any[] = [], baseX = Math.floor(point.x()), baseY = Math.floor(point.y()), baseZ = Math.floor(point.z());
        var limit = Math.max(6, Math.round(cap)), r = Math.ceil(radius), inner = Math.max(0.5, radius * 0.16);
        for (var dx = -r; dx <= r && cells.length < limit; dx++) for (var dz = -r; dz <= r && cells.length < limit; dz++) {
            var distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > radius || distance < inner) continue;
            var x = baseX + dx, z = baseZ + dz;
            for (var dy = 1; dy >= -2; dy--) {
                var y = baseY + dy;
                var block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                var id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                var surface = bulldozeCracked(id);
                if (surface !== "" && surface !== id) cells.push({ x: x, y: y, z: z, block: surface });
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        requiresGround: true,
        id: "bulldoze",
        name: "Bulldoze",
        description: "把重量砸进地面，一圈地裂贴着地表向外推：只命中站在地上的敌人，被扫到的速度下降并被向外震开；推到最后在地表留下裂痕。深踏式窄而重、多降一级速度，广踏式更广更快。",
        uses: ["一次性震到贴身的几个敌人", "削掉冲上来的人的速度", "跳过空中的目标，专打站桩的对手", "在被围住时把一圈人推开"],
        kind: "self",
        range: 3.4,
        maxRange: 5.6,
        prepare: 12,
        active: 18,
        recover: 8,
        cooldown: 34,
        style: "earthblow",
        defaults: { deep: false, ai: { maxChase: 7, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("bulldoze", "waveRadius", pokemon), geometry: "area", style: "earthblow",
                color: 0x8A7A62, label: config && config.deep === true ? "深踏" : "广踏" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon, skill: skills["bulldoze"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            var deep = !!(config && config.deep);
            return {
                prepare: p("bulldoze", "prepare", context) + (deep ? 3 : 0),
                recover: p("bulldoze", "recover", context),
                cooldown: p("bulldoze", "cooldown", context) + (deep ? 8 : -2),
                active: skills["bulldoze"].active,
                range: p("bulldoze", "waveRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("bulldoze:stomp", bulldozeScene, 1, action.origin(),
                JSON.stringify({ moment: "stomp", deep: config && config.deep === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const body = world.observe(action.actor());
            const centre = body !== null ? body.position() : action.origin();
            const radius = Math.max(1.8, p("bulldoze", "waveRadius", action));
            const power = p("bulldoze", "tremor", action);
            const stages = Math.max(1, Math.round(p("bulldoze", "snareStages", action)));
            const push = p("bulldoze", "push", action);
            const steps = Math.max(2, Math.round(p("bulldoze", "waveTicks", action)));
            const crackTicks = Math.max(40, Math.round(p("bulldoze", "crackTicks", action)));
            const scars = Math.max(6, Math.round(p("bulldoze", "scars", action)));
            const cap = Math.max(1, Math.round(p("bulldoze", "maxTargets", action)));
            const scale = radius / 3.2;
            const hitRefs: { [ref: string]: boolean } = {};
            const shaken: string[] = [];
            let step = 0, strikes = 0, settled = false;

            /** 被地裂扫实的人：等这一发伤害结算完的下一刻再压速度（与伤害同一刻会互相顶掉）。 */
            function settle(current: CombatAction): void {
                if (!shaken.length) { finish(current); return; }
                current.after(1, function (next: CombatAction) {
                    const scope = next.world();
                    for (let i = 0; i < shaken.length; i++) {
                        const actor = scope.actor(shaken[i]);
                        if (actor !== null && scope.valid(actor)) NativeEffects.boost(scope, actor, "spe", -stages);
                    }
                    finish(next);
                });
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const placed = bulldozeScar(scope, centre, radius, crackTicks, scars);
                WorldFeedback.emit(scope, bulldozeScene, 1, centre, { moment: "crack", radius: radius, cells: placed, flow: Math.round(20 + placed * 1.5) }, 30);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.1, 0)),
                    strikes > 0 ? bulldozeHitText : bulldozeMissText, strikes > 0 ? [strikes] : [], 26);
                done(current);
            }

            sound(action, "cobblemon:move.bulldoze.actor");
            WorldFeedback.emit(world, bulldozeScene, 1, centre,
                { moment: "slam", radius: radius, scale: scale, marks: Math.max(10, Math.round(power * 0.5)), intensity: Math.max(0.5, Math.min(2.2, power / 55)) }, 26);
            sound(action, "cobblemon:impact.ground");

            function advance(current: CombatAction): void {
                const scope = current.world();
                const outer = radius * (step + 1) / steps, inner = Math.max(0, radius * step / steps - 0.3);
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, inner, outer, { below: 2, above: 1 }), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(current.actor().ref()) || hitRefs[ref] || strikes >= cap) return;
                    if (!facts.grounded()) return;
                    hitRefs[ref] = true;
                    if (!hurt(current, enemy, "bulldoze", power, { damage: damageSpec("bulldoze", "tremor") })) return;
                    strikes++;
                    shaken.push(ref);
                    const away = facts.position().minus(centre);
                    if (scope.valid(enemy) && away.length() > 0.2)
                        scope.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                    WorldFeedback.emit(scope, bulldozeScene, 1, facts.position(),
                        { moment: "hit", target: ref, scale: scale, intensity: Math.max(0.5, Math.min(2, power / 55)), count: Math.round(10 + power * 0.25) }, 22);
                });
                WorldFeedback.keep(scope, "bulldoze:wave:" + String(current.actor().ref()), bulldozeScene, 1, centre,
                    { moment: "wave", radius: outer, flow: Math.round(40 + outer * 30), progress: (step + 1) / steps }, 10);
                step++;
                if (step >= steps) { settle(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }
            advance(action);
        }
    });
}
