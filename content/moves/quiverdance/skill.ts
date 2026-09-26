/**
 * 蝶舞 / quiverdance 的出手方式。
 *
 * 核心念头：一圈扬起的鳞粉。舞者只轻轻几拍，翅膀一抖就落下成片鳞粉，鳞粉在身周悬停成一圈薄幕，越抖越密；
 * 每一拍还真的向侧方点踏一小步，特攻、特防、速度依次抬起。它是这一族里最轻、最快、也唯一管特防的舞，
 * 并且真的在场上留下贴身的鳞幕。
 *
 * 三幕：
 *   起式（windup，提交前）：收翅、压低身体，翅上的鳞粉开始松动；可被打断，打断不消耗任何东西。
 *   扬鳞（提交后）：用来源独立的 boostWindow 把特攻、特防、速度各抬起并挂成可见窗口；随后按 flutters 拍
 *     抖落鳞粉，每一拍向左／右交替点踏短侧步——位移读真实回执，遇墙按实际净空缩步，不做无敌或额外躲避。
 *   垂幕（收势）：鳞粉在身周悬停成一圈贴身的幕，浮出结果；窗口走完时鳞粉散落，这三项只收回这一舞的那笔。
 *
 * 与同族分开：剑舞前压连斩、龙之舞螺旋上升、胜利之舞踏步立冠；蝶舞是**左右点踏的扬鳞**，最轻最快、
 * 抬特攻特防速度。
 */
namespace PokemonSkills {
    const quiverdanceScene = "world_combat:move_quiverdance";
    const quiverdanceBloom = "world_combat:quiverdance_bloom";
    const quiverdanceText = "world_combat.move.quiverdance.text.bloomed";
    const quiverdanceFadeText = "world_combat.move.quiverdance.text.dispersed";
    const quiverdanceContribution = "world_combat:move/quiverdance";
    /** 表现里的参考半径：`data.scale = 实际鳞幕半径 / 这个数`。 */
    const quiverdanceVeil = 1.1;
    const quiverdanceStats = ["spa", "spd", "spe"];

    define({
        freeMovement: true,
        id: "quiverdance",
        cooldownParameter: "wait",
        name: "蝶舞",
        description: "轻巧地跳起一段蝶舞：只抖几拍，每一步都向侧方轻点一小下，鳞粉从身上落下，在身周悬停成一圈薄幕，提高自己的特攻、特防和速度。鳞幕只维持一段可见的窗口，窗口走完时抬起的这三项会被收回。",
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
            const sidestep = Math.max(0.08, p("quiverdance", "sidestep", action));
            const beat = Math.max(3, Math.round(p("quiverdance", "beat", action)));
            const span = Math.max(80, Math.round(p("quiverdance", "span", action)));
            const scale = veil / quiverdanceVeil;
            // 绕当前朝向的侧向：与瞄向垂直，每拍左右交替。
            const heading = action.direction();
            const side = heading.length() > 0.01
                ? WorldCombat.point(-heading.z(), 0, heading.x()).unit()
                : WorldCombat.point(1, 0, 0);
            // 三项各自由同一个来源窗口记录实际贡献：到期或提前清除只撤这一舞的那笔，不误扣别处等级。
            const before = NativeEffects.effectiveStages(world, actor);
            const previous = MobEffects.read(world, actor, quiverdanceBloom);
            const carrier = MobEffects.apply(world, actor, quiverdanceBloom, span, 0);
            if (carrier === null) { done(action); return; }
            const owned = NativeEffects.boostWindow(world, actor, { spa: gift, spd: gift, spe: gift }, carrier.duration(),
                quiverdanceContribution, carrier, previous);
            if (!owned) { world.removeMobEffect(actor, carrier.id(), carrier.key()); done(action); return; }
            const raised = NativeEffects.effectiveStages(world, actor);
            const gains = quiverdanceStats.map(stat => Math.max(0, (raised[stat] || 0) - (before[stat] || 0)));
            const intensity = Math.max(0.6, Math.min(2, scales / 26));
            // 鳞幕绑在这次真正的三项窗口上，随窗口自然到期或提前清除一起收，贴身跟随而不是铺成地场。
            WorldFeedback.onEffect(world, owned, "world_combat:move_quiverdance/veil", quiverdanceScene, 1, body.position(),
                { moment: "veil", actor: String(actor.ref()), scales: Math.max(8, Math.round(scales / 3)), veil: veil, scale: scale });
            const perFlutter = Math.max(4, Math.round(scales / flutters));
            let index = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function bloom(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                WorldFeedback.emit(scope, quiverdanceScene, 1, here.position(),
                    { moment: "bloom", veil: veil, scale: scale, scales: scales, gift: gift, drift: drift,
                        intensity: intensity }, 34);
                WorldFeedback.text(scope, here.position().plus(WorldCombat.point(0, 1.4, 0)), quiverdanceText, [gift], 30);
                scope.sound("minecraft:block.beehive.shear", here.position(), 14, "{}");
                finish(current);
            }
            function flutterNow(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                // 短交替侧步：总偏移限制在体宽附近；探针看到墙就折半缩步，读真实位移回执。
                const lean = index % 2 === 0 ? 1 : -1;
                let want = sidestep, moved = 0;
                const self = scope.observe(actor);
                if (self !== null && want > 0) {
                    const feet = self.position().minus(WorldCombat.point(0, self.height() / 2, 0));
                    for (let attempt = 0; attempt < 2 && want > 0.04; attempt++) {
                        const probe = feet.plus(side.scale(want * lean));
                        if (scope.freeSpace(probe, Math.max(0.4, self.width()), Math.max(0.6, self.height()))) {
                            moved = scope.displace(actor, side.scale(want * lean));
                            break;
                        }
                        want *= 0.5;
                    }
                }
                const at = scope.observe(actor);
                const point = at === null ? here.position() : at.position();
                const ratio = sidestep > 0.001 ? Math.max(0, Math.min(1, Math.abs(moved) / sidestep)) : 0;
                WorldFeedback.emit(scope, quiverdanceScene, 1, point,
                    { moment: "flutter", veil: veil, scale: scale, flutters: flutters, index: index + 1,
                        scales: perFlutter, drift: drift, side: lean * ratio,
                        tap: Math.abs(moved) > 0.03 ? Math.max(4, Math.round(perFlutter * ratio)) : 0,
                        intensity: intensity }, 20);
                scope.sound(index === 0 ? "minecraft:block.amethyst_block.chime" : "minecraft:entity.breeze.idle_air", point, 12, "{}");
                index++;
                if (index >= flutters) { current.after(beat, bloom); return; }
                current.after(beat, flutterNow);
            }
            flutterNow(action);
        }
    });

    // 鳞幕窗口的等级贡献由共享 boostWindow 拥有并撤回；这里只负责窗口结束时的散落反馈。
    WorldCombat.on("world_combat:move_quiverdance/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== quiverdanceBloom) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (MobEffects.read(world, actor, quiverdanceBloom) !== null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, quiverdanceScene, 1, body.position(), { moment: "disperse", actor: String(actor.ref()) }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), quiverdanceFadeText, [], 28);
    });
}
