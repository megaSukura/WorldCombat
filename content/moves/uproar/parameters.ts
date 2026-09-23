/**
 * 吵闹 / uproar 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Normal、特殊、威力 90、命中 100、PP 10、声音招式；
 *   自身获得 volatile uproar（3 回合），期间场上不能入睡，并清掉已经睡着的目标。
 *
 * 世界化：这不是一次性伤害，而是一段**持续不断的声浪**——施法者站在原地连喊 `pulses` 声，
 *   每 `interval` 刻一圈声波以自己为圆心撞向 `radius` 内的所有活体；只要这一阵还没停，
 *   听见声音的人就挂不上睡眠（共享身份 world_combat:status/uproar 由本单元的效果携带）。
 *   声音只朝贴着的人去，所以想罩住谁就得先走进谁的身边；走出来就听不见。
 *
 * 数值来源（不同参数读不同个体数据）：
 *   shout       基础 64，特攻每比 60 多 1 加 0.26，夹 38..124；喉咙来自特攻。
 *   pulses      3 声；配置 sustain（长啸）拉到 4 声。
 *   interval    基础 24 刻，速度每比 60 快 1 减 0.07 刻，夹 14..32；节奏快的个体喊得更密。
 *   radius      基础 5 格，碰撞箱每比 1.4 高 1 格加 1.1 格，特攻再加一点，夹 3.6..9；大嗓门传得开。
 *   guardRadius 止眠范围：基础 6.5 格，体型与特攻加成同上，夹 4.8..11；比声浪略远，边缘的人只睡不着。
 *
 * 公式即最终值，执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const uproarScene = "world_combat:move_uproar";
    export const uproarVoice = "world_combat:uproar_voice";
    export const uproarRoar = "world_combat:uproar_roar";

    actionParameters.define("uproar", {
        /** 声浪威力：基础 64，特攻每比 60 多 1 加 0.26，夹 38..124。 */
        shout: formula(
            F.base(64).plus(F.stat("specialAttack").minus(60).times(0.26)).clamp(38, 124).round(1),
            "声浪威力", {
                unit: "威力",
                description: "每一圈声浪的基础威力；喉咙来自特攻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 声浪段数：3 声，长啸 4 声。 */
        pulses: formula(
            F.when(F.pref("sustain"), F.const(4), F.const(3)),
            "声浪段数", {
                unit: "段",
                description: "一次吵闹连喊几声；长啸取向多喊一声，声音拖得更久，也更容易把人留在圈里。"
            }),
        /** 声浪间隔：基础 24 刻，速度每比 60 快 1 减 0.07 刻，夹 14..32。 */
        interval: seconds(
            F.base(24).minus(F.stat("speed").minus(60).times(0.07)).clamp(14, 32).round(0),
            "声浪间隔", "每两声之间隔多久；速度快的个体喊得更密。"),
        /** 声浪半径：基础 5 格，碰撞箱每比 1.4 高 1 格加 1.1，特攻再加一点，夹 3.6..9。 */
        radius: formula(
            F.base(5).plus(F.body("height").minus(1.4).times(1.1))
                .plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.8, 2.0))
                .clamp(3.6, 9.0).round(2),
            "声浪半径", {
                unit: "格",
                description: "每一圈声浪罩住的半径；身量大、特攻高的个体声音传得更开。"
            }),
        /** 止眠范围：基础 6.5 格，体型与特攻加成同上，夹 4.8..11。 */
        guardRadius: formula(
            F.base(6.5).plus(F.body("height").minus(1.4).times(1.4))
                .plus(F.stat("specialAttack").minus(60).times(0.015).clamp(-1.0, 2.5))
                .clamp(4.8, 11.0).round(2),
            "止眠范围", {
                unit: "格",
                description: "这一阵里谁也睡不着的范围，比声浪略远；边缘的人只听得见、不会被震一下，但也睡不着。"
            })
    });

    defineDamage("uproar", "shout", {});

    describe("uproar", [
        { key: "description.0", values: ["shout","pulses"] },
        { key: "description.1", values: ["radius","interval"] },
        { key: "description.2", values: ["guardRadius"] },
        { key: "timing", values: ["prepare", "recover", "pp", "cooldown"] }
    ]);
}
