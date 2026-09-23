/**
 * 回声 / echoedvoice —— 参数、伤害段与「回声层数」的事实。
 *
 * 原生事实：Normal／特殊／威力 40／命中 100／PP 15／声音（sound、bypasssub）；
 *   描述「用回声攻击对手。如果每回合都有宝可梦接着使用该招式，威力就会提高」；
 *   原生的 pseudoWeather 每接一次把倍率 +1（1..5），威力 = 40 × 倍率（Cobblemon 1.8）。
 *
 * 翻译：即时战斗没有回合，本招把「接着有人唱下去」落成**一圈还在场上荡着的回声**。每唱一次，歌声就在
 *   传声半径内留下一层回声（共享身份 world_combat:status/echoed_voice，振幅 = 层数−1）；只要附近的回声
 *   还没散，下一个人（谁都可以，包括自己）接唱时就从那一层继续往上叠，威力 = 基础 × 层数（1..5）。
 *   所以它奖励「接得上」：一个人独唱只是普通的声音，接得越密越远，这一嗓子穿得越重。声音不被掩体阻挡。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   verse    这一嗓威力：特攻定嗓门、等级定歌艺；再乘以当前回声层数（1..5）。
 *   audible  传声半径：特攻、等级与身高决定回声能在多远处被接上，也是它和轮唱分开的关键。
 *   echoTicks 回声持续：等级与特攻决定接唱的窗口有多长。
 *   reach    歌程：特攻与等级。
 *   waveSpeed 声速：速度决定声波掠过路径多快（也驱动表现）。
 *   motes    声点数量：特攻与等级，直接驱动画面。
 *   ringRadius 声环半径：身高。
 *   tempo／settle／recharge 速度决定起手、收招、冷却。
 *
 * 配置 crescendo（渐强式）：传声半径 ×1.2、回声持续 ×1.35，更容易把链接下去，但自己这一嗓 ×0.94；
 *   关闭＝独唱式：基础 ×1.08、半径 ×0.85、持续 ×0.8，一个人也能唱得响。两向各有局面：合唱链 vs 独唱。
 */
namespace PokemonSkills {
    export const echoId = "echoedvoice";
    export const echoScene = "world_combat:move_echoedvoice";
    /** 共享身份：还在场上荡着的那层回声。振幅 = 层数 − 1。 */
    export const echoStatus = "echoed_voice";
    export const echoEffect = "world_combat:echoed_voice_echo";
    export const echoHitText = "world_combat.move.echoedvoice.text.hit";
    export const echoStackText = "world_combat.move.echoedvoice.text.stack";
    export const echoMissText = "world_combat.move.echoedvoice.text.miss";

    /** 传声半径的算术：数值从公式事实或现场事实两条入口读入，只此一份。 */
    export function echoedvoiceEarshotFrom(specialAttack: number, level: number, height: number): number {
        return Math.max(6, Math.min(13, 8.5 + (specialAttack - 60) * 0.015 + (level - 30) * 0.02 + (height - 1.4) * 0.5));
    }
    function echoedvoiceCrescendo(world: CombatWorld, actor: CombatActor): boolean {
        return read(config(world, actor, echoId), ["crescendo"]) === true;
    }
    /** 当前能接上的回声层数：附近（含自己）最强的回声层 +1，上限 5；没有回声时从第 1 层起。 */
    export function echoedvoiceLayer(world: CombatWorld, actor: CombatActor): number {
        const body = world.observe(actor);
        if (body === null) return 1;
        const source = PokemonDamage.combatants.read(world, actor);
        const earshot = echoedvoiceEarshotFrom(source.stats.spa || 60, source.level === undefined ? 30 : source.level, body.height())
            * (echoedvoiceCrescendo(world, actor) ? 1.2 : 0.85);
        const radius = Math.max(6, Math.min(14, earshot));
        const near = world.query(body.position(), radius, false);
        let strongest = -1;
        for (let index = 0; index < near.length; index++) {
            const other = near[index];
            if (!world.valid(other) || world.observe(other) === null) continue;
            const echo = CombatStatus.representative(world, other, echoStatus);
            if (echo !== null) strongest = Math.max(strongest, echo.amplifier());
        }
        return strongest < 0 ? 1 : Math.min(5, strongest + 2);
    }

    defineFacts(echoId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string) {
            if (id !== "echoedvoice.layer") return undefined;
            // 没有现场（队伍详情页的悬浮）时按第 1 层显示，让公式展示基础值；有现场时读真实层数。
            if (!context.world || !context.actor || !context.world.valid(context.actor)) return 1;
            return echoedvoiceLayer(context.world, context.actor);
        } };
    });

    actionParameters.define(echoId, {
        /** 这一嗓威力：基础 40，特攻每比 60 多 1 加 0.22（夹 −10..26），等级每比 30 高 1 加 0.3（夹 −4..10）；×回声层数、×渐强式 0.94；夹 22..210。 */
        verse: formula(
            F.base(40)
                .plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-10, 26))
                .plus(F.level().minus(30).times(0.3).clamp(-4, 10))
                .times(F.var("echoedvoice.layer", text("worldcombat.skill.echoedvoice.value.layer")))
                .times(F.when(F.pref("crescendo"), F.const(0.94), F.const(1.08)))
                .clamp(22, 210).round(1),
            "这一嗓威力", {
                unit: "威力",
                description: "这一声落在目标身上的基础威力；特攻越高嗓门越亮、等级越高歌艺越纯。乘上当前回声层数（1~5），接得越多越重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 传声半径：基础 8.5 格，特攻每比 60 多 1 加 0.015、等级每比 30 高 1 加 0.02、碰撞箱每比 1.4 高 1 格加 0.5；渐强式 ×1.2、独唱式 ×0.85；夹 6..13。 */
        audible: formula(
            F.custom(function (facts: Formula.Facts): number {
                return echoedvoiceEarshotFrom(Number(facts.read("stat.specialAttack") || 60), Number(facts.read("level") || 30), Number(facts.read("body.height") || 1.4));
            }, text("worldcombat.skill.echoedvoice.value.audible"))
                .times(F.when(F.pref("crescendo"), F.const(1.2), F.const(0.85))).clamp(6, 13).round(2),
            "传声半径", {
                unit: "格",
                description: "这一圈回声能在多远的范围内被下一个人接上；特攻、等级与身量都影响它。它决定合唱链能拉多长。"
            }),
        /** 回声持续：基础 120 刻 + 等级 ×1.2 + 特攻 ×0.4；渐强式 ×1.35、独唱式 ×0.8；夹 90..300。 */
        echoTicks: seconds(
            F.base(120).plus(F.level().times(1.2)).plus(F.stat("specialAttack").times(0.4))
                .times(F.when(F.pref("crescendo"), F.const(1.35), F.const(0.8))).clamp(90, 300).round(0),
            "回声持续", "这一圈回声在场上荡多久；窗口内接唱就能继续叠高。等级与特攻越高、渐强式留得越久。"),
        /** 歌程：基础 6.5 格，特攻每比 60 多 1 加 0.03，等级每比 30 高 1 加 0.03；夹 5.6..7.2。 */
        reach: formula(
            F.base(6.5).plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-0.8, 2.0))
                .plus(F.level().minus(30).times(0.03).clamp(-0.2, 0.8)).clamp(5.6, 7.2).round(2),
            "歌程", {
                unit: "格",
                description: "这一声能送到多远的目标；特攻高、等级高的个体声音送得更远。它也是本招的实际射程来源。"
            }),
        /** 声速：基础 1.2 格/刻，速度每比 60 快 1 加 0.004；夹 0.9..1.7。 */
        waveSpeed: formula(
            F.base(1.2).plus(F.stat("speed").minus(60).times(0.004)).clamp(0.9, 1.7).round(2),
            "声速", {
                unit: "格/刻",
                description: "声波掠过路径的速度；快的个体这一声更急，画面里的声环也走得越快。"
            }),
        /** 声点数：基础 8，特攻每比 60 多 1 加 0.12，等级每比 30 高 1 加 0.15；夹 6..24。 */
        motes: formula(
            F.base(8).plus(F.stat("specialAttack").minus(60).times(0.12)).plus(F.level().minus(30).times(0.15)).clamp(6, 24).round(0),
            "声点数", {
                unit: "个",
                description: "这一声里画出的声点数量；特攻与等级越高越密，直接驱动画面的发射量。"
            }),
        /** 声环半径：基础 0.9 格，碰撞箱每比 1.4 高 1 格加 0.3；夹 0.6..1.8。 */
        ringRadius: formula(
            F.base(0.9).plus(F.body("height").minus(1.4).times(0.3)).clamp(0.6, 1.8).round(2),
            "声环半径", {
                unit: "格",
                description: "一圈回声在目标身上收束、荡开的半径；大个子的声环更宽。"
            }),
        /** 起手：基础 8 刻 − 速度偏移[−1,2]；夹 5..14。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(5, 14).round(0),
            "起手", "开口之前吸气、起调的时间；速度越快越短。"),
        /** 收招：基础 7 刻 − 速度偏移[−1,1]；夹 4..10。 */
        settle: seconds(F.base(7).minus(F.stat("speed").minus(55).times(0.01).clamp(-1, 1)).clamp(4, 10).round(0), "收招", "这一声唱完后的收势。"),
        /** 冷却：基础 26 刻 − 速度偏移[−4,6]；夹 16..42。 */
        recharge: seconds(F.base(26).minus(F.stat("speed").minus(55).times(0.12).clamp(-4, 6)).clamp(16, 42).round(0), "冷却", "两次起唱之间的等待；速度越快回得越快。")
    });

    defineDamage(echoId, "verse", {}, { sound: true });

    stages(echoId, [
        { level: 32, values: { verse: 48 } },
        { level: 50, values: { verse: 56, echoTicks: 170 } }
    ]);

    describe(echoId, [
        { key: "description.0", values: ["verse"] },
        { key: "description.1", values: ["layer","audible","echoTicks"] },
        { key: "description.2", values: ["reach"] },
        { key: "crescendo.on", values: [], when: function (context) { return read(context.detail.values, ["crescendo"]) === true; } },
        { key: "crescendo.off", values: [], when: function (context) { return read(context.detail.values, ["crescendo"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.verse"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.verse", "tier.1.echoTicks"] }
    ], {
        layer: function (context: NumberContext): any {
            const value = context.world && context.actor && context.world.valid(context.actor) ? echoedvoiceLayer(context.world, context.actor) : 1;
            return valueBinding(value, text("worldcombat.skill.echoedvoice.value.layer"), [], text("worldcombat.value.damageTargetPending"));
        }
    });
}
