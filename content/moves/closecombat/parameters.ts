/**
 * 近身战 / closecombat 的参数与伤害段。本族「弃守强攻」最近、最快、最便宜的一记。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Fighting／物理／威力 120／命中 100／PP 5／优先度 0／接触；
 *   self boosts { def: -1, spd: -1 }，无次要效果；target normal（单体）。描述「放弃守护，向对手的怀里突击。
 *   自己的防御和特防会降低」。
 *
 * 翻译：把「不设防地抢进对手怀里、一口气打完一串快拳」翻成即时战斗里的一次**贴身连打**——不冲远，
 *   原地沉肩抢进半格，拳头一下一下砸在同一点上，最后门户大开（自身防御与特防各降一级）。它是本族里
 *   唯一用「很多下、很短、很近」表达弃守的一招：不需要助跑，起手最快、冷却最短，代价是每一拳都轻，
 *   一旦被对手走开这串拳就打在空处。
 *
 * 与同族分开：蛮力是一记最重的单发加撞飞、留坑；突飞猛扑是长程直线犁地；铠农炮在远处；画龙点睛从天而降。
 *   近身战没有助跑、没有地面残留、不撞飞，靠「贴脸三到五下快拳」被认出来。与三旋击比：三旋击是宽弧横扫、
 *   冰属性、不弃守；近身战是窄正面连打、打完自己掉防。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   flurry     总威力：物攻给力、等级拾级；横扫式把力分薄。
 *   hits       连打次数：速度决定一个呼吸能打几下（也是本招的「数」，画面粒子按它派生）。
 *   reach      贴身距离：身高给臂展、速度给抢进的一步；它也是本招射程。
 *   advance    每击垫步：速度决定打完一下能不能跟上再贴住。
 *   gap        每击间隔：速度决定节奏。
 *   push       收势推开：物攻决定把对手推离多少。
 *   arc/share  横扫式的扇角与外圈保留（物攻给宽度）。
 *   guardLoss  自身防御下降级：原生固定 1 级。
 *   poiseLoss  自身特防下降级：原生固定 1 级。
 *   motes      画面打击点数：物攻派生。
 *   tempo/aftercast/recharge：速度定节奏。
 *
 * 弃守写在「提交那一刻」：`execute` 一开始就写防／特防下降，之后无论打中还是扑空都照付——这正是本族的身份。
 *
 * 配置 `wide`（横扫式，默认关）双向取舍：
 *   开＝连打同时扫到正面 arc 度、reach 内的其他敌人，各吃 share 保留；代价是总威力 ×0.85。
 *   关（贯一式）＝全部落在单个目标身上，单点更高。
 *
 * 伤害段 `flurry` 与参数同名，走共享换算（原始类别 Physical）；命中后对手防御、相性与暴击另算。
 */
namespace PokemonSkills {
    export const closecombatId = "closecombat";

    actionParameters.define(closecombatId, {
        /** 总威力：基础 120；物攻每比 60 多 1 加 0.9（夹 −26..55）；等级每比 20 高 1 加 0.35（夹 0..20）；
         *  横扫 ×0.85；夹 80..205。 */
        flurry: formula(
            F.base(120)
                .plus(F.stat("attack").minus(60).times(0.9).clamp(-26, 55))
                .plus(F.level().minus(20).times(0.35).clamp(0, 20))
                .times(F.when(F.pref("wide", text("worldcombat.skill.closecombat.preference.wide")), F.const(0.85), F.const(1.0)))
                .clamp(80, 205).round(1),
            "连打总威力", {
                unit: "威力",
                description: "整串快拳加起来打在对手身上的力；物攻给力、等级越高越沉。横扫式把力分薄，单点低一点。对手防御、相性与暴击在命中时另算。"
            }),
        /** 连打次数：基础 3 下；速度每比 55 快 1 加 0.02（夹 0..2）；夹 2..5，取整。 */
        hits: formula(
            F.base(3).plus(F.stat("speed").minus(55).times(0.02).clamp(0, 2)).clamp(2, 5).round(0),
            "连打次数", {
                unit: "下",
                description: "一个呼吸里能打完几下；速度快的个体出手更密。这个数直接决定画面里拳头炸开的次数与间隔。"
            }),
        /** 贴身距离：基础 1.7 格；身高每比 1.4 高 1 格加 0.6（夹 −0.3..0.6）；速度每比 55 快 1 加 0.006（夹 −0.1..0.3）；
         *  夹 1.4..2.6。 */
        reach: formula(
            F.base(1.7)
                .plus(F.body("height").minus(1.4).times(0.6).clamp(-0.3, 0.6))
                .plus(F.stat("speed").minus(55).times(0.006).clamp(-0.1, 0.3))
                .clamp(1.4, 2.6).round(2),
            "贴身距离", {
                unit: "格",
                description: "要贴到多近才够得着；高个子臂展长、快的个体抢进的半步更远。它也是本招的实际射程与指示线长度。"
            }),
        /** 每击垫步：基础 0.12 格；速度每比 55 快 1 加 0.002（夹 0..0.12）；夹 0.1..0.3。 */
        advance: formula(
            F.base(0.12).plus(F.stat("speed").minus(55).times(0.002).clamp(0, 0.12)).clamp(0.1, 0.3).round(2),
            "每击垫步", {
                unit: "格",
                description: "每打完一下向对手贴进多少，跟上对方的小退步；越快跟得越紧，串拳更不容易断。"
            }),
        /** 每击间隔：基础 5 刻；速度每比 55 快 1 减 0.03（夹 −1..2）；夹 3..7。 */
        gap: formula(
            F.base(5).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2)).clamp(3, 7).round(0),
            "每击间隔", {
                unit: "刻",
                description: "两拳之间隔多久；速度越快节奏越密，整串打得越快。"
            }),
        /** 收势推开：基础 0.25 格；物攻每比 60 多 1 加 0.004（夹 −0.08..0.25）；夹 0.15..0.6。 */
        push: formula(
            F.base(0.25).plus(F.stat("attack").minus(60).times(0.004).clamp(-0.08, 0.25)).clamp(0.15, 0.6).round(2),
            "收势推开", {
                unit: "格",
                description: "最后一拳把对手推离多少；物攻越高顶得越开，但远不如同族的单体重击。"
            }),
        /** 横扫扇角：横扫式 = 110 + 物攻偏移[0,60] / 贯一式 = 0；夹 0..170。 */
        arc: formula(
            F.when(F.pref("wide", text("worldcombat.skill.closecombat.preference.wide")),
                F.base(110).plus(F.stat("attack").minus(60).times(0.6).clamp(0, 60)).clamp(90, 170), F.const(0))
                .clamp(0, 170).round(0),
            "横扫扇角", {
                unit: "度",
                description: "横扫式下正面这一片扇形的张角；物攻越高扫得越宽。画面里那片扇面就是会被打到的范围。"
            }),
        /** 外圈保留：横扫式 = 0.45 − 物攻偏移[−0.12,0.15] / 贯一式 = 0；夹 0..0.8。 */
        share: percent(
            F.when(F.pref("wide", text("worldcombat.skill.closecombat.preference.wide")),
                F.base(0.45).minus(F.stat("attack").minus(60).times(0.0015).clamp(-0.12, 0.15)), F.const(0))
                .clamp(0, 0.8).round(2),
            "外圈保留", "横扫式扫到的其他目标保留多少威力；物攻越高越均匀。只有横扫式有。"),
        /** 自身防御下降级：原生固定 1 级；夹 1..6。 */
        guardLoss: formula(
            F.const(1).clamp(1, 6).round(0),
            "自身防御下降", {
                unit: "级",
                description: "放弃守护后自身防御下降的能力等级；原生固定 1 级，提交那一刻就付，无法回避。"
            }),
        /** 自身特防下降级：原生固定 1 级；夹 1..6。 */
        poiseLoss: formula(
            F.const(1).clamp(1, 6).round(0),
            "自身特防下降", {
                unit: "级",
                description: "放弃守护后自身特防下降的能力等级；原生固定 1 级，提交那一刻就付。"
            }),
        /** 打击点数：基础 14；物攻每比 60 多 1 加 0.12（夹 0..20）；夹 12..34。 */
        motes: formula(
            F.base(14).plus(F.stat("attack").minus(60).times(0.12).clamp(0, 20)).clamp(12, 34).round(0),
            "打击点数", {
                unit: "点",
                description: "每一下砸出的火花量；物攻越高越炸得开。画面密度按它派生。"
            }),
        /** 起手：基础 8 刻；速度每比 55 快 1 减 0.02（夹 −1..2）；夹 5..11。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(5, 11).round(0),
            "起手", "沉肩抢进、把第一拳压出去之前的时间；速度越快越短。"),
        /** 收招：基础 8 刻；速度每比 55 快 1 减 0.02（夹 −1..2）；夹 5..11。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(5, 11).round(0),
            "收招", "打完一串把散掉的重心收回来的时间；本族里最短。"),
        /** 冷却：基础 34 刻；速度每比 55 快 1 减 0.05（夹 −3..6）；夹 24..48。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.05).clamp(-3, 6)).clamp(24, 48).round(0),
            "冷却", "两次贴身弃守之间等待多久；本族里回气最快的一招。")
    });

    stages(closecombatId, [
        { level: 30, values: { flurry: 132, hits: 4 } },
        { level: 50, values: { flurry: 150, reach: 2.2 } }
    ]);

    defineDamage(closecombatId, "flurry", {}, { contact: true });

    describe(closecombatId, [
        { key: "description.0", values: ["flurry","hits"] },
        { key: "description.1", values: ["reach","gap","push","advance"] },
        { key: "description.2", values: ["guardLoss", "poiseLoss"] },
        { key: "wide.on", values: ["arc","share"], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.flurry", "tier.0.hits"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.flurry", "tier.1.reach"] }
    ]);
}
