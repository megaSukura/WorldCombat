/**
 * 蝶舞 / quiverdance 的出手方式。
 *
 * 核心念头：一圈扬起的鳞粉。舞者只轻轻几拍，翅膀一抖就落下成片鳞粉，鳞粉在身周悬停成一圈薄幕，越抖越密；
 * 特攻、特防、速度依次抬起。它是这一族里最轻、最快、也唯一管特防的舞，并且真的在场上留下悬停的鳞幕。
 *
 * 三幕：
 *   起式（windup，提交前）：收翅、压低身体，翅上的鳞粉开始松动；可被打断，打断不消耗任何东西。
 *   扬鳞（提交后）：特攻、特防、速度各抬起（原生 +1），并把这段「鳞幕」挂成可见窗口；随后按 flutters 拍
 *     抖落鳞粉，每拍从身侧向外洒出一圈。
 *   垂幕（收势）：鳞粉在身周悬停成幕，浮出结果；幕存续期间每 20 刻续播一次悬停鳞粉。窗口走完时鳞粉散落，
 *     这段舞抬起的三项等级一并收回。
 *
 * 与同族分开：剑舞前压连斩、龙之舞螺旋上升、胜利之舞踏步立冠；蝶舞是**原地扬鳞**，最轻最快、抬特攻特防速度。
 */
namespace PokemonSkills {
    const quiverdanceScene = "world_combat:move_quiverdance";
    const quiverdanceBloom = "world_combat:quiverdance_bloom";
    const quiverdanceText = "world_combat.move.quiverdance.text.bloomed";
    const quiverdanceFadeText = "world_combat.move.quiverdance.text.dispersed";
    /** 表现里的参考半径：`data.scale = 实际鳞幕半径 / 这个数`。 */
    const quiverdanceVeil = 1.1;
    const quiverdanceStats = ["spa", "spd", "spe"];

    function quiverdanceStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    function quiverdanceGrant(world: CombatWorld, actor: CombatActor, amount: number): number {
        let least = amount;
        for (let index = 0; index < quiverdanceStats.length; index++) {
            const stat = quiverdanceStats[index], before = quiverdanceStage(world, actor, stat);
            NativeEffects.boost(world, actor, stat, amount);
            least = Math.min(least, quiverdanceStage(world, actor, stat) - before);
        }
        return Math.max(0, least);
    }
    function quiverdanceOpen(world: CombatWorld, actor: CombatActor, ticks: number, levels: number): void {
        if (levels <= 0) return;
        const existing = MobEffects.read(world, actor, quiverdanceBloom);
        const total = Math.min(6, Math.max(0, existing === null ? 0 : existing.amplifier()) + levels);
        MobEffects.apply(world, actor, quiverdanceBloom, ticks, total);
    }

    define({
        id: "quiverdance",
        name: "蝶舞",
        description: "轻巧地跳起神秘而又美丽的舞蹈，提高自己的特攻、特防和速度。",
        uses: ["开战前把特攻特防速度一起垫起来", "被法术压着打时先扬一层鳞幕", "边走位边铺开鳞粉，把身周变成自己的场地"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 7,
        active: 1,
        recover: 5,
        cooldown: 96,
        style: "bloom",
        stationary: true,
        defaults: { veil: false, ai: { maxChase: 16, minGap: 2 } },
        fields: [flag("veil", "厚幕")],
        indicator: function (config, pokemon) {
            return { radius: Math.max(1.2, p("quiverdance", "veil", pokemon) + 0.6), geometry: "area", style: "bloom", color: 0xE8B0D8,
                label: config && config.veil ? "蝶舞 · 厚幕" : "蝶舞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["quiverdance"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("quiverdance", "tempo", context)),
                recover: Math.round(p("quiverdance", "aftercast", context)),
                cooldown: Math.round(p("quiverdance", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_quiverdance:unfurl", quiverdanceScene, 1, action.origin(),
                JSON.stringify({ moment: "unfurl", veil: config && config.veil ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(2, Math.round(p("quiverdance", "gift", action))));
            const flutters = Math.max(2, Math.min(5, Math.round(p("quiverdance", "flutters", action))));
            const scales = Math.max(10, Math.round(p("quiverdance", "scales", action)));
            const veil = Math.max(0.4, p("quiverdance", "veil", action));
            const drift = Math.max(0.03, p("quiverdance", "drift", action));
            const beat = Math.max(3, Math.round(p("quiverdance", "beat", action)));
            const span = Math.max(80, Math.round(p("quiverdance", "span", action)));
            const scale = veil / quiverdanceVeil;
            const levels = quiverdanceGrant(world, actor, gift);
            quiverdanceOpen(world, actor, span, levels);
            const perFlutter = Math.max(4, Math.round(scales / flutters));
            let index = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function bloom(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                WorldFeedback.emit(scope, quiverdanceScene, 1, here.position(),
                    { moment: "bloom", veil: veil, scale: scale, scales: scales, gift: gift, drift: drift,
                        intensity: Math.max(0.7, Math.min(2.2, scales / 26)) }, 34);
                WorldFeedback.keep(scope, "world_combat:move_quiverdance/veil/" + String(actor.ref()), quiverdanceScene, 1, here.position(),
                    { moment: "veil", actor: String(actor.ref()), scales: Math.max(8, Math.round(scales / 3)), veil: veil, scale: scale }, 40);
                WorldFeedback.text(scope, here.position().plus(WorldCombat.point(0, 1.4, 0)), quiverdanceText, [gift], 30);
                scope.sound("minecraft:block.beehive.shear", here.position(), 14, "{}");
                finish(current);
            }
            function flutterNow(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                WorldFeedback.emit(scope, quiverdanceScene, 1, here.position(),
                    { moment: "flutter", veil: veil, scale: scale, flutters: flutters, index: index + 1,
                        scales: perFlutter, drift: drift, intensity: Math.max(0.6, Math.min(2, scales / 26)) }, 20);
                scope.sound(index === 0 ? "minecraft:block.amethyst_block.chime" : "minecraft:entity.breeze.idle_air", here.position(), 12, "{}");
                index++;
                if (index >= flutters) { current.after(beat, bloom); return; }
                current.after(beat, flutterNow);
            }
            flutterNow(action);
        }
    });

    // 垂幕存续期间：每 20 刻续播一次身周悬停的鳞粉（低密度、贴脚边，让出视线）。鳞粉数量与半径按当前体型重算。
    WorldCombat.on("world_combat:move_quiverdance/veil-tick", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== quiverdanceBloom || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, quiverdanceBloom) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const veil = Math.max(0.4, 0.6 + body.height() * 0.35);
        WorldFeedback.keep(world, "world_combat:move_quiverdance/veil/" + String(actor.ref()), quiverdanceScene, 1, body.position(),
            { moment: "veil", actor: String(actor.ref()), scales: 12, veil: veil, scale: veil / quiverdanceVeil }, 40);
    });

    // 鳞幕窗口走完：把这段舞抬起的特攻、特防、速度原样收回（只收到各自当前持有的正等级）。
    WorldCombat.on("world_combat:move_quiverdance/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== quiverdanceBloom) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const levels = Math.max(1, Math.round(Number(data.amplifier) || 1));
        for (let index = 0; index < quiverdanceStats.length; index++) {
            const stat = quiverdanceStats[index];
            const loss = Math.min(levels, Math.max(0, quiverdanceStage(world, actor, stat)));
            if (loss > 0) NativeEffects.boost(world, actor, stat, -loss);
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, quiverdanceScene, 1, body.position(), { moment: "disperse", actor: String(actor.ref()) }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), quiverdanceFadeText, [], 28);
    });
}
