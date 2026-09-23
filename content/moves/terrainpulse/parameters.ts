/**
 * 大地波动 / terrainpulse —— 参数、伤害段与场地读取。
 *
 * 核心念头：一脚顿地，把脚下这块地的脉动顺着地面送向目标。站上场地（电气／青草／薄雾／精神）时，
 * 波会带上那片场地的元素、威力翻倍；悬空时接不到地气，就只是一道普通的波。
 *
 * 数值来源（原生）：Normal／特殊／威力 50／命中 100／PP 10；在场地且接地时威力 ×2、属性随场地
 * （electricterrain→Electric、grassyterrain→Grass、mistyterrain→Fairy、psychicterrain→Psychic）。
 *
 * 场地读取：共享层以语义身份 `WorldEffects.terrain(<场地>)` 标记一片场地，四种场地招式与掀起同名场地的
 * surge 特性声明同一身份；本单元只查身份，不枚举任何生产者的规则 id。属性由伤害 `resolve` 读取，
 * 预览、AI 与命中同源。
 *
 * 事实接入：脚下是否有场地是自定义纯事实 `ground.charged`（`defineFacts`），供威力公式与悬浮共用。
 */
namespace PokemonSkills {
    export interface TerrainpulseTerrain { type: string; colour: number; }
    /**
     * 场地按共享语义身份读取，不枚举生产者的规则 id：四种场地招式与掀起同名场地的 surge 特性都声明同一身份，
     * 于是这里只认「哪片场地」而不认「谁铺的」。
     */
    const terrainpulseFields: { rule: string; terrain: TerrainpulseTerrain }[] = [
        { rule: WorldEffects.terrain("electricterrain"), terrain: { type: "electric", colour: 0xF8D030 } },
        { rule: WorldEffects.terrain("grassyterrain"), terrain: { type: "grass", colour: 0x78C850 } },
        { rule: WorldEffects.terrain("mistyterrain"), terrain: { type: "fairy", colour: 0xEE99AC } },
        { rule: WorldEffects.terrain("psychicterrain"), terrain: { type: "psychic", colour: 0xF85888 } }
    ];
    /** 一个点是否落在某片场地里；`WorldEffects.areas` 按来源与邻近效果收集现有场地。 */
    function terrainpulseAreaAt(world: CombatWorld, rule: string, point: CombatPoint): boolean {
        var areas = WorldEffects.areas(world, rule);
        for (var i = 0; i < areas.length; i++) {
            var dx = areas[i].position[0] - point.x(), dz = areas[i].position[2] - point.z();
            if (Math.sqrt(dx * dx + dz * dz) <= areas[i].radius) return true;
        }
        return false;
    }
    /** 读出脚下场地的元素；没有场地返回 null。 */
    export function terrainpulseTerrainAt(world: CombatWorld | null, point: CombatPoint | null): TerrainpulseTerrain | null {
        if (!world || !point) return null;
        for (var i = 0; i < terrainpulseFields.length; i++)
            if (terrainpulseAreaAt(world, terrainpulseFields[i].rule, point)) return terrainpulseFields[i].terrain;
        return null;
    }
    function terrainpulsePoint(context: any): CombatPoint | null {
        if (!context || !context.world) return null;
        var actor = context.actor;
        if (actor && context.world.valid(actor)) {
            var body = context.world.observe(actor);
            return body ? body.position() : null;
        }
        return null;
    }
    /** 接地且脚下有场地才算蓄力；悬空接不到地气。 */
    export function terrainpulseChargedAt(world: CombatWorld | null, point: CombatPoint | null): boolean {
        if (!world || !point) return false;
        var actor = world.source(), body = world.valid(actor) ? world.observe(actor) : null;
        if (!body || !body.grounded()) return false;
        return !!terrainpulseTerrainAt(world, point);
    }
    defineFacts("terrainpulse", function (context: FactContext): Formula.Facts {
        return {
            read: function (id: string): Formula.Fact {
                if (id === "ground.charged") return terrainpulseChargedAt(context.world || null, terrainpulsePoint(context));
                return undefined;
            },
            expand: function (id: string): Formula.Explanation | undefined {
                if (id !== "ground.charged") return undefined;
                return { value: terrainpulseChargedAt(context.world || null, terrainpulsePoint(context)) ? 1 : 0,
                    label: { key: "worldcombat.skill.terrainpulse.value.charged" }, terms: [] };
            }
        };
    });

    actionParameters.define("terrainpulse", {
        // 威力 = 50 + 特攻成长；接地且有场地时 ×2，共鸣时每一波 ×0.7。
        pulse: formula(
            F.base(50).plus(F.stat("specialAttack").minus(60).times(0.2))
                .times(F.when(F.var("ground.charged", { key: "worldcombat.skill.terrainpulse.value.charged" }), F.const(2), F.const(1)))
                .times(F.when(F.pref("resonate"), F.const(0.7), F.const(1)))
                .clamp(35, 170).round(1),
            "威力", { base: 50, unit: "威力", description: "接地且站在场地上时 ×2；共鸣时每一波 ×0.7。对手防御、相性与暴击在命中时另算。" }),
        // 顿地时间：速度快顿得早。
        charge: seconds(
            F.base(9).minus(F.stat("speed").minus(40).max(0).times(0.05)).clamp(4, 15).round(0),
            "顿地时间", "把地气收进这一脚需要多久；手快的人更短。"),
        // 施放距离：等级越高能推得越远。
        reach: formula(
            F.base(11).plus(F.level().minus(20).max(0).times(0.08)).clamp(9, 20).round(1),
            "施放距离", { unit: " 格", description: "波能沿地面推到多远；等级越高越远。" }),
        // 波速：速度决定沿地面推进的快慢。
        velocity: formula(
            F.base(1.0).plus(F.stat("speed").minus(40).max(0).times(0.007)).clamp(0.8, 1.6).round(2),
            "波速", { unit: " 格/刻", description: "波沿地面推进的速度；越快越难躲。" }),
        // 判定半径：体型高度决定波的覆盖高度与粗细。
        radius: formula(
            F.base(0.34).plus(F.body("height").minus(1.4).max(0).times(0.1)).clamp(0.3, 0.66).round(2),
            "判定半径", { unit: " 格", description: "波的碰撞半径；高个子的波更粗。" }),
        // 爆发数量：直接驱动命中粒子，随威力增长。
        bursts: formula(
            F.base(16).plus(F.stat("specialAttack").minus(60).max(0).times(0.16))
                .times(F.when(F.var("ground.charged", { key: "worldcombat.skill.terrainpulse.value.charged" }), F.const(1.5), F.const(1)))
                .clamp(12, 48).round(0),
            "爆发数量", { unit: " 个", description: "命中处炸起的粒子数量；特攻越高、场地加持时越密。粒子按它发射。" }),
        // 地环半径：命中处那道贴地环的半径，也用于共鸣第二波的作用半径。
        ring: formula(
            F.base(1.2).plus(F.level().minus(20).max(0).times(0.02)).clamp(1.2, 2.4).round(2),
            "地环半径", { unit: " 格", description: "命中处贴地环的半径；共鸣时也用作第二波的作用半径。" }),
        repeatDelay: hidden(8)
    });

    defineDamage("terrainpulse", "pulse", { defenceCoefficient: 0.0046, rationale: "地脉推进穿透略强，让场地与特攻的差别更可见。" }, {
        resolve: function (damage: PokemonDamage.FeatureContext): PokemonDamage.Metadata | undefined {
            if (!damage.world || !damage.actor) return undefined;
            var body = damage.world.observe(damage.actor);
            if (!body || !body.grounded()) return undefined;
            var terrain = terrainpulseTerrainAt(damage.world, body.position());
            return terrain ? { type: terrain.type } : undefined;
        }
    });
    describe("terrainpulse", [
        { key: "description.0", values: ["pulse"] },
        { key: "description.1", values: ["charge","reach"] },
        { key: "description.2", values: ["ring"] },
        { key: "timing", values: ["prepare", "recover", "cooldown"] }
    ]);
}
