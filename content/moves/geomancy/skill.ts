/**
 * 大地掌控 / geomancy 的出手方式。
 *
 * 核心念头：把身体扎进大地、从地脉吸取能量——一圈地纹在脚下亮起、顺着裂缝把光抽上来，使用者一动不动地
 *   立在阵心；能量吸满的下一刻，地纹猛地亮透、能量反冲回身体，特攻、特防、速度同时大涨。
 *   它是这一族里唯一的**两拍蓄力**，也是唯一把自己钉在地上、并在场上留下一圈持续地纹的一招。
 *
 * 三幕：
 *   定身（windup，提交前）：收势、脚下浮起地纹的轮廓；可被打断，打断不消耗任何东西。
 *   汲取（提交后）：立刻 Pay：把自己挂上 rooted（立定不动），挂上共享身份 world_combat:status/geomancy 的
 *     蓄力窗口，并把地纹表现挂在这次 rooted 窗口上——窗口跑满 absorb 刻，光点沿纹路越聚越密、颜色由暗转亮，
 *     进度就是实际剩余吸收时间；窗口一收（自然结束或被打断提前清除），地纹同时收。
 *   爆发或崩散（absorb 刻后）：没被睡得／冻住、蓄力窗口还在时，特攻、特防、速度各 +gift，地纹炸开、三股能量
 *     入身；被控住或窗口提前结束时，能量半途崩散、什么也拿不到。
 *
 * 与同族分开：龙之舞／蝶舞是一拍完成的自我强化，破壳是自损换爆发；大地掌控是唯一**必须站着等第二拍**的招，
 * 也是唯一会在脚下留下一圈持续地纹、并把「吸取进度」画出来的招。
 */
namespace PokemonSkills {
    const geomancyScene = "world_combat:move_geomancy";
    const geomancyCharge = "world_combat:geomancy_charge";
    const geomancyChargingText = "world_combat.move.geomancy.text.charging";
    const geomancyReleaseText = "world_combat.move.geomancy.text.release";
    const geomancyCollapseText = "world_combat.move.geomancy.text.collapse";
    /** 表现里的参考半径：`data.scale = 实际阵心半径 / 这个数`。 */
    const geomancyReference = 2.4;
    /** 地纹表现挂在本次施放创建的 rooted 窗口上；窗口一收，地纹同时收。 */
    const geomancyRuneKey = "world_combat:move_geomancy/rune";

    define({
        freeMovement: true,
        requiresGround: true,
        id: "geomancy",
        cooldownParameter: "wait",
        name: "大地掌控",
        description: "把身体扎进大地吸取地脉能量：脚下亮起一圈地纹、立定不动吸满能量，下一拍地纹炸开、能量反冲，特攻、特防、速度同时提高。蓄力期间若被睡得或冻住、或蓄力窗口被提前清除，能量崩散、什么也拿不到。",
        uses: ["开战前在安全距离先扎地蓄力", "用一段立定换取三项永久提升", "在脚下留下地纹、标记这块战场"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 10,
        active: 1,
        recover: 8,
        cooldown: 120,
        style: "geomancy",
        stationary: true,
        defaults: { ai: { maxChase: 22, safeGap: 8 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: Math.max(1.2, p("geomancy", "circle", pokemon)), geometry: "area", style: "geomancy", color: 0x8FD46A,
                label: "大地掌控" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["geomancy"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("geomancy", "tempo", context)),
                recover: Math.round(p("geomancy", "aftercast", context)),
                cooldown: Math.round(p("geomancy", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_geomancy:settle", geomancyScene, 1, action.origin(),
                JSON.stringify({ moment: "gather" }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(2, Math.round(p("geomancy", "gift", action))));
            const absorb = Math.max(12, Math.round(p("geomancy", "absorb", action)));
            const circle = Math.max(1.2, p("geomancy", "circle", action));
            const runes = Math.max(12, Math.round(p("geomancy", "runes", action)));
            const rise = Math.max(0.02, p("geomancy", "rise", action));
            const linger = Math.max(20, Math.round(p("geomancy", "linger", action)));
            const scale = circle / geomancyReference;
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));

            // rooted 是这次立定的真实来源；地纹表现挂在它上面，随它自然结束或提前清除一起收。
            const rootedId = WorldEffects.apply(world, actor, "rooted", {}, absorb + 6);
            MobEffects.apply(world, actor, geomancyCharge, absorb + 4, gift);
            if (rootedId > 0)
                WorldFeedback.onEffect(world, rootedId, geomancyRuneKey, geomancyScene, 1, feet,
                    { moment: "channel", actor: String(actor.ref()), absorb: absorb, runes: runes, circle: circle,
                        rise: rise, scale: scale });
            WorldFeedback.emit(world, geomancyScene, 1, feet,
                { moment: "plant", actor: String(actor.ref()), gift: gift, absorb: absorb, circle: circle, runes: runes,
                    rise: rise, scale: scale, intensity: Math.max(0.8, Math.min(2.2, runes / 26)) }, absorb + 16);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), geomancyChargingText, [], absorb);
            world.sound("minecraft:block.beacon.activate", feet, 16, "{}");

            let settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            action.after(absorb, function (current: CombatAction) {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                const at = here.position();
                const held = CombatStatus.behaves(scope, actor, "sleep") || CombatStatus.behaves(scope, actor, "frozen");
                // 蓄力窗口提前消失同样算中断：没有窗口就没有可兑现的能量，不留假增益。
                const window = MobEffects.read(scope, actor, geomancyCharge);
                if (held || window === null) {
                    if (rootedId > 0) scope.operation(rootedId, "world_combat:dispel", "{}");
                    WorldFeedback.emit(scope, geomancyScene, 1, at,
                        { moment: "collapse", actor: String(actor.ref()), circle: circle, scale: scale, runes: runes }, 26);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.4, 0)), geomancyCollapseText, [], 26);
                    scope.sound("minecraft:block.beacon.deactivate", at, 14, "{}");
                    finish(current);
                    return;
                }
                NativeEffects.boost(scope, actor, "spa", gift);
                NativeEffects.boost(scope, actor, "spd", gift);
                NativeEffects.boost(scope, actor, "spe", gift);
                WorldFeedback.emit(scope, geomancyScene, 1, at,
                    { moment: "release", actor: String(actor.ref()), gift: gift, circle: circle, scale: scale, runes: runes,
                        rise: rise, intensity: Math.max(1, Math.min(2.6, gift + runes / 30)) }, 40);
                // 独立余波：地纹余光按本身寿命亮 linger 刻。
                WorldFeedback.emit(scope, geomancyScene, 1, at,
                    { moment: "residue", actor: String(actor.ref()), linger: linger, circle: circle, scale: scale,
                        runes: Math.min(runes, 32), intensity: Math.max(0.6, Math.min(1.8, runes / 40)) }, linger + 12);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.4, 0)), geomancyReleaseText, [gift], 32);
                scope.sound("minecraft:block.beacon.power_select", at, 18, "{}");
                finish(current);
            });
        }
    });
}
