/**
 * 暗影拳 / shadowpunch 的出手方式。
 *
 * 核心念头：本体不动，暗影从对手脚下的影子里凝成拳，再从对手自己的影子中立起一只拳打它——
 *   拳的起点就在对手站的地方，预判不到，所以必中。
 *
 * 两幕：
 *   起（coil，提交前）：脚下的影子拉长、翻涌（可读的预告）。
 *   凝（seep → rise → strike）：提交后暗影潜入对手自己的影子（对手看得到脚下先聚起一团暗影，需要一点时间），
 *       随后从对手的脚影/身侧短升起一只拳，触及身体才按 `shadow` 结算接触伤害；开了 `hold` 还会拽住它拖向施法者。
 *       目标离场或跑出射程则拳从空影子里落回（fizzle）。
 *
 * 与同族分开：出奇一击是施法者本人瞬移到对手背后；暗影拳是**施法者站着不动、招式本身从对手自己的影子里
 *   升起一只拳去打**。暗影是无形体的灵体，普通墙体不阻挡它（沿用灵体政策）；但拳只打锁定的那一个目标，没有范围。
 */
namespace PokemonSkills {
    const shadowpunchScene = "world_combat:move_shadowpunch";
    const shadowpunchFizzleText = "world_combat.move.shadowpunch.text.fizzle";
    const shadowpunchHitText = "world_combat.move.shadowpunch.text.hit";

    define({
        id: "shadowpunch",
        cooldownParameter: "recharge",
        name: "Shadow Punch",
        description: "本体不动，暗影潜入对手脚下的影子里，再从对手自己的影子中立起一只拳打它——拳的起点就在对手站的地方，预判不到，所以必中。暗影是无形体的灵体，普通墙体挡不住它，但拳只打锁定的那一个目标。开了地缚还会把它拖向自己。",
        uses: ["让拳从对手自己的影子里升起", "站着不动打到远处的对手", "用影子抓住并拖住对手"],
        kind: "enemy",
        range: 7,
        maxRange: 11,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 50,
        style: "shadow",
        defaults: { hold: false, ai: { maxChase: 12, grounding: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("shadowpunch", "reach", pokemon), geometry: "line", style: "shadow", color: 0x8A5FD0,
                label: config && config.hold === true ? "暗影拳·地缚" : "暗影拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["shadowpunch"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("shadowpunch", "tempo", context)),
                recover: Math.round(p("shadowpunch", "settle", context)),
                cooldown: Math.round(p("shadowpunch", "recharge", context)),
                active: 0,
                range: p("shadowpunch", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("shadowpunch:coil", shadowpunchScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", windup: prepare, target: action.target() === null ? "" : String(action.target()!.ref()),
                    hold: !!(config && config.hold) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const hold = !!(config && config.hold);
            const self = world.observe(actor);

            function fizzle(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, shadowpunchScene, 1, at, { moment: "fizzle" }, 20);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), shadowpunchFizzleText, [], 22);
                scope.sound("minecraft:entity.vex.ambient", at, 10, "{}");
                done(current);
            }

            if (self === null || target === null || !world.valid(target)) { fizzle(action, action.origin()); return; }
            const body = world.observe(target);
            if (body === null) { fizzle(action, action.origin()); return; }
            const origin = self.position();
            const at = body.position();
            const reach = p("shadowpunch", "reach", action);
            const distance = at.minus(origin).length();
            if (distance > reach) { fizzle(action, origin); return; }
            const seep = Math.max(0.4, p("shadowpunch", "seep", action));
            const travel = Math.max(2, Math.min(14, Math.round(distance / seep)));
            const targetRef = String(target.ref());

            // A short omen in the target's own shadow; no long ground line is drawn, the shadow simply sinks into it.
            WorldFeedback.emit(world, shadowpunchScene, 1, at,
                { moment: "seep", target: targetRef, travel: travel, hold: hold ? 1 : 0 }, 30);
            sound(action, "cobblemon:move.shadowball.actor");

            action.after(travel, function (current: CombatAction) {
                const scope = current.world();
                const victim = scope.actor(targetRef);
                if (victim === null || !scope.valid(victim) || scope.observe(victim) === null) { fizzle(current, at); return; }
                const victimBody = scope.observe(victim)!;
                const atNow = victimBody.position();
                if (atNow.minus(origin).length() > reach) { fizzle(current, atNow); return; }
                const rise = p("shadowpunch", "rise", current);
                const fist = p("shadowpunch", "fist", current);
                const riseTicks = Math.max(2, Math.min(6, Math.round(rise / 0.25)));
                // One real fist rises from the target's own shadow side; the hit only settles once it reaches the body.
                WorldFeedback.emit(scope, shadowpunchScene, 1, atNow,
                    { moment: "rise", target: targetRef, rise: rise, scale: fist / 0.4, riseTicks: riseTicks,
                        riseSpeed: rise / riseTicks, hold: hold ? 1 : 0 }, 26);
                current.after(riseTicks, function (next: CombatAction) {
                    const scene = next.world();
                    const power = p("shadowpunch", "shadow", next);
                    const landed = hurt(next, victim, "shadowpunch", power,
                        { damage: damageSpec("shadowpunch", "shadow"), contact: true, punch: true });
                    const hitBody = scene.observe(victim);
                    const hitAt = hitBody !== null ? hitBody.position() : atNow;
                    if (landed) {
                        WorldFeedback.emit(scene, shadowpunchScene, 1, hitAt,
                            { moment: "strike", target: targetRef, rise: rise, scale: fist / 0.4,
                                power: Math.round(power * 10) / 10, hold: hold ? 1 : 0 }, 26);
                        scene.sound("cobblemon:impact.ghost", hitAt, 16, "{}");
                        WorldFeedback.text(scene, hitAt.plus(WorldCombat.point(0, 1.1, 0)), shadowpunchHitText, [], 24);
                        if (hold) {
                            const puller = scene.observe(next.actor());
                            const pulled = scene.observe(victim);
                            if (puller !== null && pulled !== null) {
                                const toward = puller.position().minus(pulled.position());
                                if (toward.length() > 0.05) scene.hitDisplace(victim, toward.unit().scale(p("shadowpunch", "drag", next)));
                            }
                        }
                    } else {
                        WorldFeedback.emit(scene, shadowpunchScene, 1, hitAt, { moment: "fizzle" }, 20);
                    }
                    done(next);
                });
            });
        }
    });
}
