/**
 * 打草结 / grassknot 的出手方式。
 *
 * 核心念头：把脚下这片地的草与根须叫起来，让对手被自己的分量带倒。施法者自始至终不碰对手——
 * 它做的只是「把地交给对手」。对手越重，这一跤摔得越狠。
 *
 * 三幕（提交前只播预告）：
 *   起（windup）：俯身把手按进土里，草种沿地面朝目标钻去。
 *   芽（sprout）：提交后在目标脚下铺开一圈苔草，藤结在范围里慢慢收紧——这是留给对手的余地，走出范围就整发躲开。
 *   绊（trip）：延迟一到，缠结收拢；范围里所有敌人吃 `snare` 伤害、被绊住（MobEffect 身份 tripped + rooted），
 *       对宝可梦再掉速度等级；草皮在世界里留一段时间（terrain 租借，linger，到期归还）。
 *
 * 提交后才触碰世界；`windup` 只用 action.present 与 action.sense()。伤害按每个目标各自的体重分别求值。
 */
namespace PokemonSkills {
    const grassknotScene = "world_combat:move_grassknot";
    const grassknotSnareEffect = "world_combat:grassknot_snare";
    const grassknotTripText = "world_combat.move.grassknot.text.trip";
    const grassknotMissText = "world_combat.move.grassknot.text.miss";
    /** 表现里的参考半径：`data.scale = 实际缠结范围 / 这个数`，让地面环与判定同半径。 */
    const grassknotReferenceRadius = 2.4;

    /** 在落点铺一圈草皮：地表换成苔藓、上面长出矮草；租借，到期原方块回来。 */
    function grassknotPatch(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [];
        const r = Math.ceil(radius);
        const cx = Math.floor(centre.x()), cz = Math.floor(centre.z()), cy = Math.floor(centre.y());
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            const x = cx + dx, z = cz + dz;
            for (let dy = 1; dy >= -3; dy--) {
                const y = cy + dy;
                const block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                if (id !== "minecraft:moss_block") cells.push({ x: x, y: y, z: z, block: "minecraft:moss_block" });
                const above = world.block(WorldCombat.point(x, y + 1, z));
                if (above !== null && (String(above.id()) === "minecraft:air" || String(above.id()) === "minecraft:cave_air"))
                    cells.push({ x: x, y: y + 1, z: z, block: "minecraft:short_grass" });
                break;
            }
        }
        if (!cells.length) return 0;
        try { return world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
    }

    /** 用某个具体目标的事实求这一次缠绊的威力；目标体重只有在这里才读得到。 */
    function grassknotStrike(action: CombatAction, world: CombatWorld, target: CombatActor, values: any): number {
        const context: NumberContext = { pokemon: CobblemonCombat.pokemon(action.actor()), skill: skills["grassknot"],
            detail: { values: values }, world: world, actor: action.actor(), target: { world: world, actor: target } };
        return p("grassknot", "snare", context);
    }

    /** 绊住一个目标：挂共享身份 tripped 的 MobEffect、掉速度等级、短时间无法迈步。 */
    function grassknotTrip(world: CombatWorld, target: CombatActor, stages: number, rootTicks: number, tripTicks: number): void {
        MobEffects.apply(world, target, grassknotSnareEffect, Math.max(20, Math.round(tripTicks)), 0);
        NativeEffects.boost(world, target, "spe", -Math.max(1, stages));
        WorldEffects.apply(world, target, "rooted", {}, Math.max(6, Math.round(rootTicks)));
    }

    define({
        id: "grassknot",
        name: "Grass Knot",
        description: "把脚下的草与根须叫起来，让对手被自己的分量带倒：对手越重摔得越狠。它在目标脚下铺开一圈草皮，稍等片刻后收拢，把还站在里面的人绊住；走出这圈就躲开了。缠绞式缠得更久更广但收得更慢。",
        uses: ["让笨重的目标自己被分量带倒", "在对手脚下留一块草皮、封住一片落脚地", "远程削弱高速或高攻的重型对手"],
        kind: "enemy",
        range: 6,
        maxRange: 11,
        prepare: 8,
        active: 40,
        recover: 7,
        cooldown: 26,
        style: "plant",
        defaults: { knot: false, ai: { maxChase: 12, minMass: 0 } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["grassknot"], detail: { values: config } };
            return { radius: p("grassknot", "snareRadius", context), geometry: "area", style: "plant", color: 0x6FA34A, label: "打草结" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["grassknot"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const knot = !!(config && config.knot);
            return {
                prepare: Math.max(1, Math.round(p("grassknot", "prepare", context))),
                recover: Math.round(p("grassknot", "recover", context)) + (knot ? 2 : 0),
                cooldown: Math.round(p("grassknot", "cooldown", context)) + (knot ? 8 : 0),
                range: p("grassknot", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_grassknot:windup", grassknotScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", knot: !!(config && config.knot) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const landing = action.targetPosition();
            const radius = p("grassknot", "snareRadius", action);
            const delay = Math.max(4, Math.round(p("grassknot", "snareDelay", action)));
            const patchTicks = Math.round(p("grassknot", "patchTicks", action));
            const scale = radius / grassknotReferenceRadius;

            sound(action, "minecraft:block.rooted_dirt.place");
            grassknotPatch(world, landing, radius, patchTicks);
            WorldFeedback.emit(world, grassknotScene, 1, landing,
                { moment: "sprout", radius: radius, scale: scale, delay: delay }, Math.max(14, delay + 18));

            action.after(delay, function (current) {
                const scope = current.world();
                const rootTicks = Math.max(6, Math.round(p("grassknot", "rootTicks", current)));
                const tripTicks = Math.max(30, Math.round(p("grassknot", "tripTicks", current)));
                const stages = Math.max(1, Math.round(p("grassknot", "tripStages", current)));
                let caught = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(landing, 0, radius, { below: 1.5, above: 2.5 }),
                    function (target, facts) {
                        const power = grassknotStrike(current, scope, target, config);
                        const landed = hurt(current, target, "grassknot", power, { damage: damageSpec("grassknot", "snare") });
                        caught++;
                        if (landed) grassknotTrip(scope, target, stages, rootTicks, tripTicks);
                        WorldFeedback.emit(scope, grassknotScene, 1, facts.position(),
                            { moment: "trip", target: String(target.ref()), intensity: Math.max(0.6, Math.min(2.2, power / 70)),
                                coils: 8 + stages * 4 }, 30);
                    });
                WorldFeedback.emit(scope, grassknotScene, 1, landing,
                    { moment: caught > 0 ? "snap" : "empty", radius: radius, scale: scale, caught: caught }, 30);
                sound(current, caught > 0 ? "cobblemon:impact.grass" : "minecraft:block.grass.break");
                WorldFeedback.text(scope, landing.plus(WorldCombat.point(0, 1.2, 0)),
                    caught > 0 ? grassknotTripText : grassknotMissText, caught > 0 ? [caught] : [], 26);
                done(current);
            });
        }
    });
}
