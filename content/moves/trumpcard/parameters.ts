/**
 * 王牌 / trumpcard — 参数与伤害段。
 *
 * 原生事实：一般、特殊、命中必定（accuracy true）、PP 5、接触标记但不作接触结算、无次要效果；
 * 威力按本招剩余 PP 分档，PP 越少越高（余 4 及以上 40 → 余 0 时 200）（Cobblemon 1.8，23 位学习者）。
 *
 * 翻译：把「剩余 PP 越少威力越大」翻成即时战斗里的一件事——**最后一张牌最重**。它是本组唯一的远程成员：
 * 把一张牌掷出去，牌在对手身上炸开。读数就是这招自己的 PP：每用一次牌就更旧一分，下一掷更重，
 * 最后一张是全场最重的一掷。与另外三招分开：只有它走投射物，只有它把「自己的资源余量」当威力表。
 *
 * 数据分散：power 读本招剩余 PP 比例与特攻；flightSpeed 读速度；flightRange 读等级；turn 读特攻；
 * push 读体重；collisionRadius 读体型。配置 sure（必中式）让牌自己拐弯追人（几乎不会落空），
 * 但飞行更慢、威力 ×0.9——想稳就换掉一点伤害，想狠就掷直球。
 */
namespace PokemonSkills {
    actionParameters.define("trumpcard", {
        /** 王牌威力：基础 34，余牌消耗（1 − 剩余 PP 比例）×74（0..74），特攻每比 60 多 1 加 0.14（夹 −6..+22），等级每高 1 加 0.3（夹 −4..+12）；必中 ×0.9；夹在 24..152。 */
        power: formula(
            F.base(34)
                .plus(F.const(1).minus(F.resource("ppRatio", text("worldcombat.skill.trumpcard.value.ppRatio"))).clamp(0, 1)
                    .times(74).as(text("worldcombat.skill.trumpcard.value.spent")))
                .plus(F.stat("specialAttack").minus(60).times(0.14).clamp(-6, 22).as(text("worldcombat.skill.trumpcard.value.focus")))
                .plus(F.level().minus(20).times(0.3).clamp(-4, 12).as(text("worldcombat.value.level")))
                .times(F.when(F.pref("sure", text("worldcombat.skill.trumpcard.preference.sure")), F.const(0.9), F.const(1)))
                .clamp(24, 152).round(1),
            "王牌威力", {
                unit: "威力",
                description: "这一张牌造成的威力；本招剩余 PP 越少越重，最后一张最重，特攻给出锐度。对手防御、相性与暴击在命中时另算。"
            }),
        /** 余牌消耗：1 − 本招剩余 PP 比例，夹在 0..1。它是本招威力的读数来源，也用于表现强度。 */
        spent: percent(
            F.const(1).minus(F.resource("ppRatio", text("worldcombat.skill.trumpcard.value.ppRatio"))).clamp(0, 1).round(3),
            "余牌消耗", "这叠牌用掉了多少；越大代表剩下的牌越少、这一掷越重，末牌是满值。"),
        /** 投后余牌：本招当前 PP − 1（这一张会付掉），夹在 0..每叠上限。它是画面里手中剩余小牌数的读数来源。 */
        ppRemaining: formula(
            F.resource("pp").minus(1).clamp(0, 99),
            "投后余牌", {
                unit: "张",
                description: "这一掷用掉一张后还剩几张牌；0 表示这是末牌。补满 PP 后这个值会跟着回升，不会再显示成末牌。"
            }),
        /** 这叠牌上限：本招最大 PP，用于把余牌换算成档位；拿不到时按 5。 */
        maxCards: formula(F.resource("maxPp").clamp(1, 99), "", { visible: false, base: 5 }),
        /** 飞行速度：基础 0.9 格/刻，速度每比 60 多 1 加 0.005（夹 −0.15..+0.4），必中 ×0.85；夹在 0.6..1.5。 */
        flightSpeed: formula(
            F.base(0.9).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.15, 0.4))
                .times(F.when(F.pref("sure", text("worldcombat.skill.trumpcard.preference.sure")), F.const(0.85), F.const(1)))
                .clamp(0.6, 1.5).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "牌飞出去的速度；直球更快、更难被躲开，必中式的牌拐弯追人所以略慢。"
            }),
        /** 投掷距离：基础 11 格，等级每高 1 加 0.08（夹 −1..+4）；夹在 9..16。它同时是实际射程来源。 */
        flightRange: formula(
            F.base(11).plus(F.level().minus(20).times(0.08).clamp(-1, 4)).clamp(9, 16).round(1),
            "投掷距离", {
                unit: "格",
                description: "牌能飞到多远；等级高的个体扔得更远。"
            }),
        /** 转向：基础 10 度/刻，特攻每比 60 多 1 加 0.05 度（夹 −1..+6）；夹在 7..20。仅必中式使用。 */
        turn: formula(
            F.base(10).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-1, 6)).clamp(7, 20).round(1),
            "追踪转向", {
                unit: "度/刻",
                description: "必中式里牌每刻朝目标转向的最大角度；特攻越高拐得越急，追得越死。直球式不使用。"
            }),
        /** 顶开距离：基础 0.35 格，体重每比 50 重 1 加 0.002（夹 −0.06..+0.6）；夹在 0.1..1.0。 */
        push: formula(
            F.base(0.35).plus(F.body("weight").minus(50).times(0.002).clamp(-0.06, 0.6)).clamp(0.1, 1.0).round(2),
            "顶开距离", {
                unit: "格",
                description: "牌炸开时把目标沿飞行方向推开多远；越重推得越远。"
            }),
        /** 判定半径：基础 0.32 格，碰撞箱每比 1.4 高 1 格加 0.06；夹在 0.25..0.55。 */
        collisionRadius: formula(
            F.base(0.32).plus(F.body("height").minus(1.4).times(0.06)).clamp(0.25, 0.55).round(2),
            "判定半径", {
                unit: "格",
                description: "牌的横向判定半径；身板越大扔出的牌越大。"
            }),
        life: hidden(200)
    });

    defineDamage("trumpcard", "power", {});

    describe("trumpcard", [
        { key: "description.0", values: ["power", "spent", "ppRemaining"] },
        { key: "description.1", values: ["flightSpeed", "flightRange", "collisionRadius"] },
        { key: "description.2", values: ["turn", "push"] },
        { key: "sure.on", values: [], when: function (context) { return read(context.detail.values, ["sure"]) === true; } },
        { key: "sure.off", values: [], when: function (context) { return read(context.detail.values, ["sure"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
