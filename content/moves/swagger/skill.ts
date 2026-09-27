/**
 * 虚张声势 / swagger 的执行组织。
 *
 * 核心念头：贴着对手喊一句最扎心的挑衅，把它的怒火点着。它变得更能打（攻击等级提高），
 * 但每次出手都可能被怒火冲昏——这次出手作废；就算打中了，怒火也反噬它自己，越凶砸得越重。
 * 而且它真的把这股火冲着你来。
 *
 * 出手：短起手（windup 播红怒预告）后提交。
 * 命中：NativeEffects.boost 一条路径把攻击礼物送给任何对象；CombatStatus.apply 挂共享混乱身份
 *       world_combat:status/confusion；world.target 把怪物仇恨拉向施法者。
 * 分幕：怒符（礼物本身）与仇恨转移（goad 拉线）分开呈现；混乱没挂上时仍播礼物与灰白「不为所动」。
 * 持续：本次反噬参数（含挑畔语气 goad）随真实混乱载体保存到托管载体上；头顶飞鸟与参数绑定在这份载体上
 *       （WorldFeedback.onEffect），随混乱自然到期、被牛奶／/effect clear 或换上新载体而同时收场。
 * 随机分支：目标每次试图出手（world_combat:before_commit）按 chance 掷骰；中则本次出手作废。
 * 反噬：目标每次真正主动打中非友方时（world_combat:damage_applied，排除反噬自伤与被动伤害），按统一有效攻击
 *       事实结算自伤：普通实体的 attack_damage 已含等级修饰不再乘阶，宝可梦的礼物等级会抬高这份有效攻击；
 *       自伤上限绑定该次攻击的实际伤害，避免高生命目标只因为血多就被按比例白削；反噬自伤自身不会再触发一次。
 * 反制：抬高的攻击同样落在施法者与它队友身上；混乱可被共享策略在施加时拒绝（此处仍照给礼物）。
 */
namespace PokemonSkills {
    const swaggerScene = "world_combat:move_swagger";
    const swaggerConfusion = "world_combat:swagger_confusion";
    const swaggerRageText = "world_combat.move.swagger.text.rage";
    const swaggerResistText = "world_combat.move.swagger.text.resist";
    const swaggerRecoilText = "world_combat.move.swagger.text.recoil";

    /** 本招自己的混乱身份：只有当代表载体就是本单元的 id 时，本单元的行为才接管。 */
    function swaggerCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === swaggerConfusion ? effect : null;
    }

    /**
     * 统一的当前有效物攻事实：直接读 CombatantStats 的实际 facts。
     * 普通实体的 attack_damage 属性已经带上原生能力等级修饰，不能再乘阶。
     * 宝可梦的 facts.stats.atk 不含等级阶梯，礼物的攻击等级会把这份基数一起抬高，所以要乘当前 atk 倍率。
     */
    function swaggerEffectiveAttack(world: CombatWorld, actor: CombatActor): number {
        const facts = PokemonDamage.combatants.read(world, actor);
        let attack = facts.stats.atk || 0;
        if (String(actor.domain()) === "cobblemon") {
            const native = facts.data.native;
            if (native && native.state) attack *= NativeEffects.multiplier(NativeEffects.stage(native.state, "atk"));
        }
        return attack;
    }
    /** 本次施法保存下来的反噬参数：绑定到真实混乱载体，与礼物同一实际攻击。 */
    function swaggerRageOf(world: CombatWorld, actor: CombatActor): { fraction: number; cap: number } | null {
        const views = world.effects(actor, swaggerRageMark);
        if (!views.length) return null;
        const value = JSON.parse(String(views[0].data()));
        if (typeof value.fraction !== "number" || !isFinite(value.fraction) || value.fraction <= 0) return null;
        return { fraction: value.fraction, cap: typeof value.cap === "number" && isFinite(value.cap) ? value.cap : swaggerRecoilCap };
    }

    // 怒火存续的托管载体：反噬参数与头顶飞鸟都绑在真实混乱效果的剩余时间与当前 key 上。
    // 自然到期、牛奶／/effect clear、换上新载体（key 变化）都随它一起停，不靠自己的计时，也不留残影。
    const swaggerRageMark = "world_combat:move_swagger/rage";
    WorldCombat.effect(swaggerRageMark, 1, 600, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.key !== "string" || !value.key) throw new Error("Invalid swagger rage carrier key");
        if (typeof value.fraction !== "number" || !isFinite(value.fraction) || value.fraction <= 0) throw new Error("Invalid swagger rage fraction");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    function swaggerRageWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        const body = world.valid(target) ? world.observe(target) : null;
        const value = JSON.parse(effect.state());
        const carrier = CombatStatus.representative(world, target, "confusion");
        if (body === null || carrier === null || String(carrier.id()) !== swaggerConfusion || String(carrier.key()) !== value.key) {
            effect.end(); return;
        }
        WorldFeedback.onEffect(world, effect.id(), "dazed", swaggerScene, 1, body.position(),
            { moment: "dazed", target: String(target.ref()) });
        const remaining = carrier.duration() < 0 ? 600 : Math.max(1, Math.min(600, carrier.duration()));
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effectHandler(swaggerRageMark, "start", swaggerRageWatch);
    WorldCombat.effectHandler(swaggerRageMark, "watch", swaggerRageWatch);
    WorldCombat.effectHandler(swaggerRageMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 混乱被牛奶／/effect clear 提前拿掉时，立即撤掉托管表现与反噬参数，不等下一次巡检。
    WorldCombat.on("world_combat:move_swagger/rage-release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== swaggerConfusion) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        world.effects(actor, swaggerRageMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    define({
        id: "swagger",
        cooldownParameter: "wait",
        name: "虚张声势",
        description: "激怒单个对手：送给它数级攻击、让它陷入混乱，并把非玩家目标的仇恨拉向自己。被点着的目标每次出手可能作废，打中敌人时还会被自己抬高的攻击反噬；攻击提升不会随混乱结束而回退。",
        uses: ["把重击手的火力引向自己", "给难缠的目标制造失手窗口", "在队友集火前先把对手点着"],
        kind: "enemy",
        range: 10,
        prepare: 9,
        active: 1,
        recover: 8,
        cooldown: 150,
        style: "taunt",
        defaults: { goad: false, ai: { maxChase: 12, leaveStation: false } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["swagger"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("swagger", "telegraph", context)),
                recover: Math.round(p("swagger", "aftermath", context)),
                cooldown: Math.round(p("swagger", "wait", context)),
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_swagger:windup", swaggerScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function () { return { radius: 10, geometry: "point", style: "taunt", label: "虚张声势" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), caster = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, swaggerScene, 1, action.targetPosition(), { moment: "resist" }, 18);
                done(action);
                return;
            }
            const gift = Math.max(1, Math.min(3, Math.round(p("swagger", "gift", action))));
            const ticks = Math.max(1, Math.round(p("swagger", "duration", action)));
            const chance = Math.max(0.05, Math.min(0.95, p("swagger", "chance", action)));
            // 本次真正生效的反噬参数（含挑畔语气 goad 的取舍）；挂上混乱后才随载体保存。
            const recoilFraction = Math.max(0.001, p("swagger", "recoil", action));
            const recoilCap = Math.max(0, Math.min(1, p("swagger", "recoilCap", action)));
            NativeEffects.boost(world, target, "atk", gift);
            const landed = CombatStatus.apply(world, target, "confusion", swaggerConfusion, ticks,
                Math.round(chance * 100), { unique: true });
            if (landed) {
                const carrier = CombatStatus.representative(world, target, "confusion");
                const carrierKey = carrier === null ? "" : String(carrier.key());
                // 同一目标只留本招当前这份参数；旧载体被 unique 换掉后由 watcher 自行结束。
                world.effects(target, swaggerRageMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
                if (carrierKey) world.effect(swaggerRageMark, target,
                    JSON.stringify({ key: carrierKey, fraction: recoilFraction, cap: recoilCap }), ticks);
            }
            const targetBody = world.observe(target);
            const pulled = !(targetBody !== null && targetBody.player()) && world.target(target, caster);
            if (targetBody !== null) {
                const scale = Math.max(0.6, Math.min(2, ticks / 160));
                const burst = Math.round(18 + chance * 90);
                // 怒符：礼物本身落在目标身上，无论混乱是否挂上。
                WorldFeedback.emit(world, swaggerScene, 1, targetBody.position(),
                    { moment: "taunt", target: String(target.ref()), gift: gift, burst: burst, scale: scale, intensity: scale }, 34);
                WorldFeedback.text(world, targetBody.position().plus(WorldCombat.point(0, 1, 0)),
                    landed ? swaggerRageText : swaggerResistText, [gift], 44);
                world.sound("minecraft:entity.ravager.roar", targetBody.position(), 18, "{}");
                // 仇恨转移单独一幕：只有真的把怪物拉向自己时才画拉线。
                if (pulled && world.valid(caster)) {
                    const away = action.origin().minus(targetBody.position());
                    const direction = away.length() < 0.01 ? [0, 1, 0] : [away.x() / away.length(), away.y() / away.length(), away.z() / away.length()];
                    WorldFeedback.emit(world, swaggerScene, 1, targetBody.position(),
                        { moment: "goad", target: String(target.ref()), direction: direction }, 26);
                }
                if (!landed) WorldFeedback.emit(world, swaggerScene, 1, targetBody.position(), { moment: "resist" }, 18);
            }
            done(action);
        }
    });


    // 反噬：被点着的目标打中非友方时，按自身攻击结算一道自伤；抬高的攻击让这一下更重。
    WorldCombat.on("world_combat:swagger/recoil", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), victim = event.target();
        if (victim === null || String(actor.key()) === String(victim.key()) || world.friendly(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        // 只响应真实攻击回执：反噬自伤（cause 为混乱）不再触发第二次，被动/环境伤害也不算。
        if (String(data.cause || "") === "world_combat:confusion") return;
        if (!DamageSemantics.directOffense(data)) return;
        if (swaggerCarrier(world, actor) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const rage = swaggerRageOf(world, actor);
        const attack = swaggerEffectiveAttack(world, actor);
        const fraction = (rage === null ? swaggerRecoilFraction : rage.fraction) * Math.max(0.4, Math.min(2.5, attack / 100));
        // 基数按最大生命，但上限绑定这一次攻击的实际伤害，Boss 不会因血多被白削。
        const base = body.maxHealth() * fraction;
        const cap = data.actual * (rage === null ? swaggerRecoilCap : rage.cap);
        const loss = -world.health(actor, -Math.min(base, cap), "world_combat:confusion");
        if (loss <= 0) return;
        const power = Math.max(0.2, Math.min(3, loss / Math.max(1, body.maxHealth()) * 12));
        WorldFeedback.emit(world, swaggerScene, 1, body.position(), { moment: "fumble", target: String(actor.ref()), power: power }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), swaggerRecoilText, [Math.round(loss * 10) / 10], 30);
        world.sound("minecraft:entity.player.hurt", body.position(), 14, "{}");
    });
}
