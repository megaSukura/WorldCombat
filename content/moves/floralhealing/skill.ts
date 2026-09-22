/**
 * 花疗 / Floral Healing —— 执行组织。
 *
 * 核心念头：撒一路花瓣到伤者身上，花在他脚下当场绽开、把生命缝回去；脚下的草越盛，花开得越大。
 *
 * 出手：共享节奏。windup（提交前）只播预告——手心先拢起一捧花瓣；准备可被打断，不花代价。
 * 绽放（提交后，当场结算）：花瓣沿施法者到伙伴的连线撒过去，在伙伴身上绽开一圈花瓣并立刻回复；如果伙伴
 *   脚下是青草场地（它带着共享身份 world_combat:status/grassyterrain），这一口抬到约 2/3、花也更亮。
 * 留花（residue）：在伙伴脚下真的种下几朵花（`world.terrain` 租借、`linger`，到期原方块回来）——战斗在玩家的
 *   家里，这几朵花会自己谢去，不永久占用地面。
 *
 * 反制：花疗当场兑现、无法被打断；它的代价是只救得了别人、救不了自己，且必须够得到那个伙伴。
 * 与同族分开：治愈波动是一圈赶路、会被身体挡下的波；花疗是花瓣当场在伤者身上绽开、并在地面留下花，吃青草场地。
 */
namespace PokemonSkills {
    const floralhealingScene = "world_combat:move_floralhealing";
    const floralhealingTextBloom = "world_combat.move.floralhealing.text.bloom";
    const floralhealingTextGrass = "world_combat.move.floralhealing.text.grass";
    const floralhealingFlowers = ["minecraft:pink_petals", "minecraft:dandelion", "minecraft:poppy", "minecraft:cornflower", "minecraft:azure_bluet"];

    function floralhealingAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    /** 回复走共享健康写入；宝可梦经过 NativeEffects.heal（含受治疗加成），其他战斗者直接写 MC 生命。 */
    function floralhealingHeal(world: CombatWorld, target: CombatActor, fraction: number, cause: string): number {
        var body = world.observe(target);
        if (!body) return 0;
        var missing = body.maxHealth() - body.health();
        if (missing <= 0) return 0;
        var amount = Math.min(missing, body.maxHealth() * Math.max(0, Math.min(1, fraction)));
        if (amount <= 0) return 0;
        var healed = 0;
        if (String(target.domain()) === "cobblemon" && world.valid(target)) {
            var pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, target, pokemon, amount / scale, cause);
        } else {
            healed = world.health(target, amount, "world_combat:" + cause);
        }
        var after = world.observe(target);
        if (healed > 0 && after) feedback(world, target, after.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }

    function floralhealingSoil(id: string): boolean {
        return /grass|dirt|podzol|moss|mud|farmland|mycelium|root/.test(id);
    }

    /** 在伙伴脚下真的有土的地方种几朵花；租借、到期原方块回来。返回种下的朵数。 */
    function floralhealingBloom(world: CombatWorld, centre: CombatPoint, radius: number, budget: number, ticks: number): number {
        if (budget <= 0) return 0;
        var cells: any[] = [];
        var cx = Math.floor(centre.x()), cz = Math.floor(centre.z()), cy = Math.floor(centre.y());
        var r = Math.max(1, Math.ceil(radius));
        for (var dx = -r; dx <= r && cells.length < budget; dx++) for (var dz = -r; dz <= r && cells.length < budget; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            var x = cx + dx, z = cz + dz;
            for (var dy = 1; dy >= -3; dy--) {
                var block = world.block(WorldCombat.point(x, cy + dy, z));
                if (block === null) continue;
                var id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock") break;
                if (!floralhealingSoil(id)) break;
                var above = world.block(WorldCombat.point(x, cy + dy + 1, z));
                if (above === null) break;
                var aboveId = String(above.id());
                if (aboveId !== "minecraft:air" && aboveId !== "minecraft:short_grass" && aboveId !== "minecraft:tall_grass") break;
                cells.push({ x: x, y: cy + dy + 1, z: z, block: floralhealingFlowers[cells.length % floralhealingFlowers.length] });
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(60, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: floralhealingId, name: "花疗",
        description: "撒一路花瓣到选定的友方身上，在他脚下当场绽开并回复其最大生命的一半左右；如果伙伴站在青草场地上，回复提高到约三分之二。之后地上会留下几朵短命的花。只救别人，不救自己。",
        uses: ["远远地给伙伴补一口，顺手在地上开花", "在青草场地上把回复抬到三分之二", "用可读的花簇标记被救过的位置"],
        kind: "friend", range: 5, maxRange: 9, prepare: 9, active: 0, recover: 8, cooldown: 130, style: "floral",
        maximumTicks: 220,
        defaults: { bouquet: false },
        fields: [flag("bouquet", "繁花")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[floralhealingId], detail: { values: config } };
            return { radius: p(floralhealingId, "bloomRadius", context), geometry: "point", style: "floral", color: 0xE89AC0,
                label: config && config.bouquet === true ? "繁花疗" : "花疗" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[floralhealingId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const bouquet = !!(config && config.bouquet);
            return {
                prepare: Math.max(4, Math.round(p(floralhealingId, "tempo", context))),
                recover: Math.max(3, Math.round(p(floralhealingId, "settle", context))),
                cooldown: Math.round(p(floralhealingId, "cooldown", context) * (bouquet ? 1.1 : 0.95)),
                active: 0,
                range: p(floralhealingId, "reach", context)
            };
        },
        ready: function (action) {
            const target = action.target();
            if (target === null) return "invalid-target";
            if (String(target.ref()) === String(action.actor().ref())) return "invalid-target";
            if (!action.sense().friendly(target)) return "invalid-target";
            return "";
        },
        windup: function (action, _config, prepare) {
            action.present("floralhealing:windup", floralhealingScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", petals: p(floralhealingId, "petals", action),
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            const body = world.observe(self);
            if (!body || target === null || !world.valid(target) || String(target.ref()) === String(self.ref())) { done(action); return; }
            const mate = world.observe(target);
            if (mate === null) { done(action); return; }
            const bouquet = !!(config && config.bouquet);
            const fraction = Math.max(0, Math.min(1, p(floralhealingId, "heal", action)));
            const radius = Math.max(0.4, p(floralhealingId, "bloomRadius", action));
            const petals = Math.max(8, Math.round(p(floralhealingId, "petals", action)));
            const budget = Math.max(0, Math.round(p(floralhealingId, "flowers", action)));
            const grass = CombatStatus.has(world, target, "grassyterrain");
            const scale = Math.max(0.6, Math.min(2.0, radius / 0.8));
            const ref = String(target.ref());
            const before = mate.health();

            floralhealingHeal(world, target, fraction, "floralhealing");
            const after = world.observe(target);
            const gained = after ? Math.max(0, after.health() - before) : 0;
            const share = mate.maxHealth() > 0 ? Math.max(0, Math.min(1, gained / mate.maxHealth())) : 0;
            const laid = floralhealingBloom(world, mate.position().plus(WorldCombat.point(0, -mate.height() / 2, 0)), radius, budget, 120);
            const path: (string | number[])[] = [String(self.ref()), ref];

            sound(action, "minecraft:block.flowering_azalea.place");
            WorldFeedback.emit(world, floralhealingScene, 1, body.position(),
                { moment: "scatter", target: ref, path: path, petals: petals, scale: scale, grass: grass ? 1 : 0, radius: radius }, 30);
            WorldFeedback.emit(world, floralhealingScene, 1, mate.position(),
                { moment: "bloom", target: ref, petals: petals, scale: scale, grass: grass ? 1 : 0, radius: radius,
                    gold: grass ? Math.max(8, Math.round(petals * 0.5)) : 0, share: share,
                    healDust: Math.max(10, Math.round(petals * (0.4 + share))), gained: Math.round(gained * 10) / 10 }, 34);
            if (laid > 0) {
                WorldFeedback.emit(world, floralhealingScene, 1, mate.position(),
                    { moment: "residue", target: ref, flowers: laid, scale: scale }, 30);
                world.sound("minecraft:block.grass.place", mate.position(), 12, "{}");
            }
            WorldFeedback.text(world, floralhealingAbove(mate.position()), grass ? floralhealingTextGrass : floralhealingTextBloom, [Math.round(gained * 10) / 10], 30);
            done(action);
        }
    });
}
