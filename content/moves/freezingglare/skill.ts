/**
 * 冰冷视线 / freezingglare 的出手方式。
 *
 * 核心念头：抬眼锁定一个目标，从双眼中射出一道瞬发、不飞行的精神视线——念力线落到一个敌人身上后会跳向
 *   最近的下一个敌人，一路传递；因为走的是精神而不是寒气，它连本该免疫冰冻的冰属性与相关特性也能冻住。
 *
 * 三幕：
 *   起（focus，提交前）：双眼亮起、目标身上落下锁定印记的预告。
 *   凝（glare → chain ×chains → impact）：提交后瞬发——从施法者到首个目标，再逐跳跳到链内最近的敌人；
 *       每个被盯到的目标在命中前开一段免疫穿透窗口，然后结算 glare×falloff^n 的特殊伤害并按 freezeChance
 *       掷冰冻（忽略特性免疫）。没有飞行时间，视线被切断就完全无效。
 *   阻（blocked）：施法者与目标之间没有清晰视线时，念力在眼前溃散，不结算任何东西。
 *
 * 反制：需要一条通视的线——中间有方块、绕背或躲进掩体，这一记就打不出来；冰冻是概率。配置 unblinking
 * （凝视式）：多一跳、射程更远、冰冻概率更高，但起手与冷却更久。
 */
namespace PokemonSkills {
    const freezingglareScene = "world_combat:move_freezingglare";
    const freezingglareHitText = "world_combat.move.freezingglare.text.hit";
    const freezingglareBlockedText = "world_combat.move.freezingglare.text.blocked";

    function freezingglareCoords(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    /** 从 from 出发、链内最近的、未被点过且视线通视的敌人；没有就回 null。 */
    function freezingglareNext(scope: CombatWorld, from: CombatPoint, used: { [ref: string]: boolean }, range: number): CombatActor | null {
        const actors = scope.query(from, Math.max(1, Math.min(32, range)), false);
        let best: CombatActor | null = null, bestDistance = Infinity;
        for (let i = 0; i < actors.length; i++) {
            const candidate = actors[i], ref = String(candidate.ref());
            if (used[ref]) continue;
            const facts = scope.observe(candidate);
            if (facts === null || facts.friendly()) continue;
            if (!scope.clear(from, facts.position())) continue;
            const length = facts.position().minus(from).length();
            if (length < bestDistance) { bestDistance = length; best = candidate; }
        }
        return best;
    }

    define({
        id: "freezingglare",
        cooldownParameter: "wait",
        name: "Freezing Glare",
        description: "从双眼中射出一道瞬发、不飞行的精神视线：念力线在敌人之间跳跃，每个被盯到的目标各挨一次精神伤害并可能被冻住；它连本该免疫冰冻的冰属性和相关特性也能冻住。视线被切断则完全无效。凝视式多跳一次、更远更冷。",
        uses: ["对需要一条通视的风筝目标一击必中", "在挤在一起的一队敌人之间传导，一次冻住多人", "专门点掉本不该被冻住的冰属性与免疫目标"],
        kind: "enemy",
        range: 11,
        maxRange: 16,
        prepare: 8,
        active: 1,
        recover: 7,
        cooldown: 36,
        style: "gaze",
        defaults: { unblinking: false, ai: { maxChase: 15, preferChains: true, preferImmune: true } },
        fields: [flag("unblinking", "凝视式")],
        indicator: function (config, pokemon) {
            return { radius: p("freezingglare", "reach", pokemon), geometry: "line", style: "gaze", color: 0xB48CE8,
                label: config && config.unblinking === true ? "冰冷视线·凝视" : "冰冷视线·速瞥" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["freezingglare"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("freezingglare", "tempo", context)),
                recover: Math.round(p("freezingglare", "aftermath", context)),
                cooldown: Math.round(p("freezingglare", "wait", context)),
                active: 1,
                range: p("freezingglare", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("freezingglare:focus", freezingglareScene, 1, action.origin(),
                JSON.stringify({ moment: "focus", unblinking: config && config.unblinking === true }));
            action.present("freezingglare:mark", freezingglareScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "mark" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const first = action.target();
            const lash = "cobblemon:move.psychic.actor";

            if (first === null || !world.valid(first) || !world.clear(origin, action.targetPosition())) {
                WorldFeedback.emit(world, freezingglareScene, 1, origin,
                    { moment: "blocked", direction: [aim(action).x(), 0, aim(action).z()] }, 24);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), freezingglareBlockedText, [], 24);
                sound(action, "minecraft:block.beacon.deactivate");
                done(action);
                return;
            }

            const power = p("freezingglare", "glare", action);
            const falloff = Math.max(0.3, Math.min(1, p("freezingglare", "falloff", action)));
            const chains = Math.max(1, Math.round(p("freezingglare", "chains", action)));
            const chainRange = Math.max(1.5, p("freezingglare", "chainRange", action));
            const freezeChance = Math.max(0, Math.min(1, p("freezingglare", "freezeChance", action)));
            const windowTicks = Math.max(20, Math.round(p("freezingglare", "immunityWindow", action)));
            const scale = power / 88;
            const intensity = Math.max(0.6, Math.min(2.4, power / 88));
            const used: { [ref: string]: boolean } = {};
            used[String(actor.ref())] = true;
            const path: number[][] = [freezingglareCoords(origin)];
            let current: CombatActor | null = first, currentPower = power, jumps = 0;

            for (let step = 0; step < chains && current !== null; step++) {
                if (!world.valid(current)) break;
                const facts = world.observe(current);
                if (facts === null) break;
                const ref = String(current.ref());
                const at = facts.position();
                path.push(freezingglareCoords(at));
                used[ref] = true;
                jumps++;
                NativeEffects.breakTypeImmunity(world, current, windowTicks);
                const features: any = { damage: damageSpec("freezingglare", "glare"), status: "frozen", chance: freezeChance };
                features.ignoreAbility = true;
                if (hurt(action, current, "freezingglare", currentPower, features)) {
                    WorldFeedback.emit(world, freezingglareScene, 1, at,
                        { moment: "impact", target: ref, intensity: intensity, scale: scale, jump: step + 1 }, 24);
                    sound(action, "cobblemon:impact.psychic");
                }
                currentPower *= falloff;
                current = freezingglareNext(world, at, used, chainRange);
            }

            WorldFeedback.emit(world, freezingglareScene, 1, origin,
                { moment: "glare", target: String(first.ref()), path: path, chains: jumps, intensity: intensity, scale: scale,
                    rate: Math.round(80 + power * 0.8), impactCount: Math.round(14 + power * 0.3) }, 26);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.35, 0)), freezingglareHitText, [jumps], 26);
            sound(action, lash);
            done(action);
        }
    });
}
