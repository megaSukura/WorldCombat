/**
 * 破灭之光 / lightofruin 的出手方式。
 *
 * 核心念头：**借永恒之花的力量，从胸前绽开的花心迸出一根粗重的破灭光柱**——贯穿正前方整列敌人；
 * 借来的力量要还，**反噬按实际造成的伤害走**：打得越多越狠，自己掉得越狠；打空或打在免疫上都不付账。
 *
 * 三幕（提交前只播预告）：
 *   起（windup）：胸／身前绽开一朵苍白的花，花瓣一层层向内合拢蓄光，只播预告。
 *   放（ray → impact / fizzle）：提交后光柱从花心迸出，用与表现同一组顶点围出的走廊判定，贯穿走廊里
 *       最多 `pierce` 个非友方，每个各挨一次 `ray`；每次命中按实际伤害挂一次反噬（共享结算）。
 *   噬（recoil）：光柱散去后，反噬的火沿着来路烧回施法者身上，浮字报出这一次自己掉了多少。
 *
 * 与同族分开：铁蹄光线固定自损、只打第一个；叶绿爆震是扇形、自损随放出的力量；随机光没有自损。
 * 破灭之光贯穿整列、只按**真正造成的伤害**反噬——穿得越多，自己越危险，玩家凭这条反向烧回的火认它。
 */
namespace PokemonSkills {
    /** 以 origin 为起点、朝 direction 长 reach、半宽 half 的走廊四角；判定与表现共用这组顶点。 */
    function lightofruinLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): CombatPoint[] {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))];
    }
    function lightofruinPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: lightofruinId,
        name: "Light of Ruin",
        description: "Drawing power from the Eternal Flower, the user fires a powerful beam of light. This also damages the user terribly.",
        uses: ["一根粗重的贯穿光柱打穿正前方整列敌人", "让反噬只按真正造成的伤害结算", "透支式把所有力量都借出来，赌一发清场"],
        kind: "enemy",
        range: 11,
        maxRange: 20,
        prepare: 14,
        active: 22,
        recover: 10,
        cooldown: 54,
        maximumTicks: 220,
        style: "beam",
        defaults: { overdraw: false, ai: { maxChase: 14, minLine: 2, minHealth: 0.5 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(lightofruinId, "reach", pokemon) : 11, geometry: "line", style: "beam",
                color: 0xFFD9F0, label: config && config.overdraw === true ? "透支式破灭之光" : "节制式破灭之光" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[lightofruinId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(lightofruinId, "tempo", context)),
                recover: Math.round(p(lightofruinId, "aftercast", context)),
                cooldown: Math.round(p(lightofruinId, "recharge", context)),
                active: skills[lightofruinId].active,
                range: p(lightofruinId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_lightofruin:bloom", lightofruinScene, 1, action.origin(),
                JSON.stringify({ moment: "bloom", overdraw: config && config.overdraw === true ? 1 : 0,
                    petals: Math.round(p(lightofruinId, "petals", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const direction = aim(action);
            const reach = Math.max(1, p(lightofruinId, "reach", action));
            const half = Math.max(0.1, p(lightofruinId, "width", action));
            const power = p(lightofruinId, "ray", action);
            const recoil = Math.max(0, Math.min(1, p(lightofruinId, "recoil", action)));
            const pierce = Math.max(1, Math.round(p(lightofruinId, "pierce", action)));
            const petals = Math.max(1, Math.round(p(lightofruinId, "petals", action)));
            const scale = half / 0.95;
            const intensity = Math.max(0.6, Math.min(2.8, power / 140));
            const vertices = lightofruinLane(origin, direction, reach, half);
            const tip = origin.plus(direction.scale(reach));
            const before = world.observe(actor);
            const healthBefore = before !== null ? before.health() : 0;
            let hits = 0;

            sound(action, "minecraft:block.beacon.activate");
            sound(action, "minecraft:entity.illusioner.cast_spell");
            WorldFeedback.emit(world, lightofruinScene, 1, origin,
                { moment: "ray", path: lightofruinPath(vertices), direction: [direction.x(), direction.y(), direction.z()],
                    petals: petals, pierce: pierce, scale: scale, intensity: intensity,
                    notes: Math.round(40 + power * 0.6) }, 28);

            const region = WorldGeometry.polygon(vertices, { below: 2, above: 3 });
            const candidates: { actor: CombatActor; at: CombatPoint }[] = [];
            WorldGeometry.selectEnemies(world, region, function (enemy, facts) {
                if (!world.clear(origin, facts.position())) return;
                candidates.push({ actor: enemy, at: facts.position() });
            });
            candidates.sort(function (a, b) { return a.at.minus(origin).length() - b.at.minus(origin).length(); });
            for (let index = 0; index < candidates.length && hits < pierce; index++) {
                if (!world.valid(actor)) break;
                const candidate = candidates[index];
                if (!hurt(action, candidate.actor, lightofruinId, power,
                    { damage: damageSpec(lightofruinId, "ray"), recoil: recoil })) continue;
                hits++;
                WorldFeedback.emit(world, lightofruinScene, 1, candidate.at,
                    { moment: "impact", target: String(candidate.actor.ref()), petals: petals, scale: scale,
                        intensity: intensity, ordinal: hits }, 24);
            }

            if (hits > 0) {
                sound(action, "cobblemon:impact.fairy");
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.5, 0)), lightofruinHitText, [hits], 26);
            } else {
                WorldFeedback.emit(world, lightofruinScene, 1, tip, { moment: "fizzle", petals: petals, scale: scale }, 20);
                WorldFeedback.text(world, tip.plus(WorldCombat.point(0, 0.8, 0)), lightofruinMissText, [], 22);
            }

            const after = world.observe(actor);
            const selfLoss = after !== null ? Math.max(0, healthBefore - after.health()) : 0;
            if (hits > 0 && selfLoss > 0) {
                const loss = Math.round(selfLoss * 10) / 10;
                WorldFeedback.emit(world, lightofruinScene, 1, after!.position(),
                    { moment: "recoil", target: String(actor.ref()), petals: petals, scale: scale, recoil: recoil,
                        damage: loss, count: Math.max(8, Math.round(selfLoss)), intensity: Math.max(0.6, Math.min(2.8, selfLoss / 30)) }, 30);
                WorldFeedback.text(world, after!.position().plus(WorldCombat.point(0, 1.4, 0)), lightofruinRecoilText, [loss], 28);
                sound(action, "minecraft:block.respawn_anchor.charge");
            }
            done(action);
        }
    });
}
