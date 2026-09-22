/**
 * 胜利之舞 / victorydance 的出手方式。
 *
 * 核心念头：一场唤来胜利的仪典。舞者立定行礼，然后一下一下把脚步踏进地面，每踏一步从脚下荡开一圈金环；
 * 踏到终拍，一顶桂冠在头顶升起，攻击、防御、速度一起抬高。它是这一族里最长、最贵、最隆重的一支，
 * 也是唯一「越打越持久」的舞：凯旋存续期间，舞者每命中一次，这份胜利就向上延续一段（有上限）。
 *
 * 三幕：
 *   起式（windup，提交前）：立定、举臂行礼，金光自脚下聚起；可被打断，打断不消耗任何东西。
 *   仪典（提交后）：攻击、防御、速度各抬起（原生 +1），并把这场「凯旋」挂成可见窗口；随后按 beats 拍踏步，
 *     每拍从脚下荡开一圈金环。
 *   立冠（收势）：桂冠在头顶升起，浮出结果；凯旋存续期间每 20 刻续播冠冕，并且每次命中都延长一次。
 *     窗口走完时冠冕散去，这场舞抬起的三项等级一并收回。
 *
 * 与同族分开：剑舞前压连斩、龙之舞螺旋上升、蝶舞原地扬鳞；胜利之舞是**踏步立冠**的仪典，抬三项、最贵、会延续。
 */
namespace PokemonSkills {
    const victorydanceScene = "world_combat:move_victorydance";
    const victorydanceCrown = "world_combat:victorydance_crown";
    const victorydanceText = "world_combat.move.victorydance.text.crowned";
    const victorydanceRallyText = "world_combat.move.victorydance.text.rallied";
    const victorydanceFadeText = "world_combat.move.victorydance.text.faded";
    /** 表现里的参考半径：`data.scale = 实际冠冕半径 / 这个数`。 */
    const victorydanceCrownRadius = 1.2;
    const victorydanceStats = ["atk", "def", "spe"];

    function victorydanceStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    function victorydanceGrant(world: CombatWorld, actor: CombatActor, amount: number): number {
        let least = amount;
        for (let index = 0; index < victorydanceStats.length; index++) {
            const stat = victorydanceStats[index], before = victorydanceStage(world, actor, stat);
            NativeEffects.boost(world, actor, stat, amount);
            least = Math.min(least, victorydanceStage(world, actor, stat) - before);
        }
        return Math.max(0, least);
    }
    function victorydanceOpen(world: CombatWorld, actor: CombatActor, ticks: number, levels: number): void {
        if (levels <= 0) return;
        const existing = MobEffects.read(world, actor, victorydanceCrown);
        const total = Math.min(6, Math.max(0, existing === null ? 0 : existing.amplifier()) + levels);
        MobEffects.apply(world, actor, victorydanceCrown, ticks, total);
    }

    define({
        id: "victorydance",
        name: "胜利之舞",
        description: "激烈地跳起唤来胜利的舞蹈，提高自己的攻击、防御和速度。",
        uses: ["决出胜负前把攻防速一起立起来", "在对手残血时开一场仪典，靠命中把胜利延续下去", "用最隆重的舞把身位钉住、把气势摆出来"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 10,
        active: 1,
        recover: 7,
        cooldown: 140,
        style: "crown",
        stationary: true,
        defaults: { grand: false, ai: { maxChase: 16, minGap: 3 } },
        fields: [flag("grand", "隆重")],
        indicator: function (config, pokemon) {
            return { radius: Math.max(1.3, p("victorydance", "crown", pokemon) + 0.6), geometry: "area", style: "crown", color: 0xFFD75A,
                label: config && config.grand ? "胜利之舞 · 隆重" : "胜利之舞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["victorydance"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("victorydance", "tempo", context)),
                recover: Math.round(p("victorydance", "aftercast", context)),
                cooldown: Math.round(p("victorydance", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_victorydance:salute", victorydanceScene, 1, action.origin(),
                JSON.stringify({ moment: "salute", grand: config && config.grand ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(2, Math.round(p("victorydance", "gift", action))));
            const beats = Math.max(3, Math.min(6, Math.round(p("victorydance", "beats", action))));
            const pace = Math.max(4, Math.round(p("victorydance", "pace", action)));
            const crown = Math.max(0.7, p("victorydance", "crown", action));
            const span = Math.max(80, Math.round(p("victorydance", "span", action)));
            const laurels = Math.max(12, Math.round(p("victorydance", "laurels", action)));
            const scale = crown / victorydanceCrownRadius;
            const levels = victorydanceGrant(world, actor, gift);
            victorydanceOpen(world, actor, span, levels);
            const perStamp = Math.max(8, Math.round(laurels / beats));
            let index = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function crownNow(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                WorldFeedback.emit(scope, victorydanceScene, 1, here.position(),
                    { moment: "crown", crown: crown, scale: scale, beats: beats, laurels: laurels, gift: gift,
                        intensity: Math.max(0.8, Math.min(2.2, laurels / 30)) }, 36);
                WorldFeedback.keep(scope, "world_combat:move_victorydance/crown/" + String(actor.ref()), victorydanceScene, 1, here.position(),
                    { moment: "lit", actor: String(actor.ref()), crown: crown, scale: scale, laurels: Math.max(8, Math.round(laurels / 3)) }, 40);
                WorldFeedback.text(scope, here.position().plus(WorldCombat.point(0, 1.5, 0)), victorydanceText, [gift], 32);
                scope.sound("minecraft:ui.toast.challenge_complete", here.position(), 20, "{}");
                finish(current);
            }
            function stampNow(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                current.stopMovement();
                WorldFeedback.emit(scope, victorydanceScene, 1, here.position(),
                    { moment: "stamp", crown: crown, scale: scale, beats: beats, index: index + 1, laurels: perStamp,
                        intensity: Math.max(0.6, Math.min(2, laurels / 30)) }, 22);
                scope.sound(index === 0 ? "minecraft:block.note_block.basedrum" : "minecraft:block.bell.use", here.position(), 14, "{}");
                index++;
                if (index >= beats) { current.after(pace, crownNow); return; }
                current.after(pace, stampNow);
            }
            stampNow(action);
        }
    });

    // 冠冕存续期间：每 20 刻续播一次头顶的桂冠（低密度，位置在头顶上方，让出视线）。
    WorldCombat.on("world_combat:move_victorydance/lit-tick", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== victorydanceCrown || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, victorydanceCrown) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const crown = Math.max(0.7, 0.9 + body.height() * 0.35);
        WorldFeedback.keep(world, "world_combat:move_victorydance/crown/" + String(actor.ref()), victorydanceScene, 1, body.position(),
            { moment: "lit", actor: String(actor.ref()), crown: crown, scale: crown / victorydanceCrownRadius, laurels: 10 }, 40);
    });

    // 凯旋靠战果延续：存续期间舞者每命中一个非友方目标，窗口就向上延长一段，直到上限。
    WorldCombat.on("world_combat:move_victorydance/rally", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        const world = event.world(), actor = event.actor(), target = event.target();
        if (target === null || !world.valid(actor) || world.friendly(target)) return;
        const effect = MobEffects.read(world, actor, victorydanceCrown);
        if (effect === null) return;
        const remaining = effect.duration() - world.tick();
        const cap = Math.round(p("victorydance", "rallyCap")), gain = Math.round(p("victorydance", "rallyGain"));
        if (remaining >= cap) return;
        const next = Math.min(cap, remaining + gain);
        MobEffects.apply(world, actor, victorydanceCrown, next, effect.amplifier());
        const body = world.observe(actor);
        if (body === null) return;
        const crown = Math.max(0.7, 0.9 + body.height() * 0.35);
        WorldFeedback.emit(world, victorydanceScene, 1, body.position(),
            { moment: "rally", actor: String(actor.ref()), crown: crown, scale: crown / victorydanceCrownRadius,
                rally: Math.round(next / 20), intensity: Math.max(0.7, Math.min(2, next / cap + 0.4)) }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), victorydanceRallyText, [Math.round(next / 20)], 28);
        world.sound("minecraft:block.bell.resonate", body.position(), 14, "{}");
    });

    // 凯旋窗口走完：把这场舞抬起的攻击、防御、速度原样收回（只收到各自当前持有的正等级）。
    WorldCombat.on("world_combat:move_victorydance/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== victorydanceCrown) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const levels = Math.max(1, Math.round(Number(data.amplifier) || 1));
        for (let index = 0; index < victorydanceStats.length; index++) {
            const stat = victorydanceStats[index];
            const loss = Math.min(levels, Math.max(0, victorydanceStage(world, actor, stat)));
            if (loss > 0) NativeEffects.boost(world, actor, stat, -loss);
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, victorydanceScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), victorydanceFadeText, [], 28);
    });
}
