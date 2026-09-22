/**
 * 铁壁 / irondefense — 执行组织。
 *
 * 核心念头：一层铁水从脚下浇上来，沿着身体凝成一座铁像——硬，也沉。撼不动它，它也挪不开。
 *
 * 两幕：
 *   浇（windup 播「浇铸」，提交前只观察与预告，打断不花代价）。
 *   凝（提交后）：NativeEffects.boost(def, gift) 立刻写入公共能力阶梯，挂上共享身份
 *     world_combat:status/irondefense 的「铁壳」窗口；铁壳本身带击退抗性与沉重减速（见 startup.ts），
 *     播放一次从脚边铺开的铁环与溅起的铁屑。
 * 结束：铁壳被撕掉、被清除或到期时，这段防护抬起的等级原样收回——对手有一次磨掉它的反制。
 */
namespace PokemonSkills {
    const ironDefenseScene = "world_combat:move_irondefense";
    const ironDefenseShell = "world_combat:iron_defense_shell";
    const ironDefenseCladText = "world_combat.move.irondefense.text.clad";
    const ironDefenseShedText = "world_combat.move.irondefense.text.shed";
    /** 表现里的参考半径：`data.scale = 实际铁环半径 / 这个数`，让铁环与判定同半径。 */
    const ironDefenseReferenceRadius = 1.2;

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function ironDefenseStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 抬高并返回这一次真正抬到的级数（顶到上限时可能少于请求值）。 */
    function ironDefenseRaise(world: CombatWorld, actor: CombatActor, stat: string, amount: number): number {
        const before = ironDefenseStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, amount);
        return Math.max(0, ironDefenseStage(world, actor, stat) - before);
    }

    define({
        id: "irondefense",
        name: "铁壁",
        description: "将皮肤变得坚硬如铁，从而大幅提高自己的防御。",
        uses: ["在被近身围攻前先把身体淬成铁", "顶着击退站住位置，不让对手把你推开", "用可见的铁壳窗口逼对手先花时间磨它"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "iron",
        stationary: true,
        defaults: { ai: { maxChase: 12, panic: 0.55 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("irondefense", "clad", pokemon), geometry: "area", style: "iron", color: 0x8C9AA6,
                label: "铁壁" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["irondefense"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("irondefense", "tempo", context)),
                recover: Math.round(p("irondefense", "aftercast", context)),
                cooldown: Math.round(p("irondefense", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_irondefense:pour", ironDefenseScene, 1, action.origin(),
                JSON.stringify({ moment: "pour" }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(2, Math.round(p("irondefense", "gift", action))));
            const shell = Math.max(120, Math.round(p("irondefense", "shell", action)));
            const clad = Math.max(0.7, p("irondefense", "clad", action));
            const filings = Math.max(16, Math.round(p("irondefense", "filings", action)));
            const scale = clad / ironDefenseReferenceRadius;
            const levels = ironDefenseRaise(world, actor, "def", gift);
            MobEffects.apply(world, actor, ironDefenseShell, shell, levels);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, ironDefenseScene, 1, feet,
                { moment: "clad", actor: String(actor.ref()), levels: levels, clad: clad, filings: filings,
                    scale: scale, intensity: Math.max(0.8, Math.min(2, levels / 2 + filings / 48)) }, 34);
            WorldFeedback.keep(world, "irondefense:shell:" + String(actor.ref()), ironDefenseScene, 1, body.position(),
                { moment: "hold", actor: String(actor.ref()), levels: levels, scale: scale }, Math.min(shell, 220));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), ironDefenseCladText,
                [levels, Math.round(shell / 20)], 32);
            world.sound("minecraft:block.anvil.land", body.position(), 16, "{}");
            done(action);
        }
    });

    // 铁壳被撕掉、被清除或到期：把这段防护抬起的等级原样收回，只收到当前实际持有的正等级。
    WorldCombat.on("world_combat:move_irondefense/shed", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== ironDefenseShell) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const levels = Math.max(1, Math.round(Number(data.amplifier) || 1));
        const loss = Math.min(levels, Math.max(0, ironDefenseStage(world, actor, "def")));
        if (loss > 0) NativeEffects.boost(world, actor, "def", -loss);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, ironDefenseScene, 1, body.position(), { moment: "shed", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), ironDefenseShedText, [], 24);
    });
}
