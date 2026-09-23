/**
 * 治愈铃声 / Heal Bell —— 执行组织。
 *
 * 核心念头：把一口清亮的铃声送出去，铃响一次，声波扫过的地方伙伴身上的病痛就被震散——一次施放可以连响数声，
 *   每一声都洗掉当下范围内所有伙伴的有害状态效果。它不回复生命、不留持续状态：这是**当场的一下**，和「芳香治疗」
 *   那片会停留、反复净化的香云分开。
 *
 * 两幕：
 *   起（windup，提交前）：铃音在身侧收拢，只观察与预告；可被打断，不花任何代价，准备期不能移动。
 *   响（提交后）：每一声铃响都洗一次——先洗自己，再洗 chimeRadius 内每个友善伙伴的全部有害状态效果；
 *     共响 peals 声，每声间隔 pealGap。表现里环的半径就是 chimeRadius 本身，站在环外就知道不会被洗到。
 *
 * 反制：铃声只在响的那一下起作用，绕过半径或等铃声过去再挂异常即可；它不治疗，带伤硬吃反而更亏。
 * 宝可梦层：洗的是共享默认效果，清掉后原生队伍面板同步干净；没有新状态需要声明。
 */
namespace PokemonSkills {
    function healbellAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    /** 清除一个战斗者身上的全部有害状态效果，返回实际洗掉的项数。 */
    function healbellCleanse(world: CombatWorld, actor: CombatActor): number {
        return CombatStatus.cureHarmful(world, actor);
    }

    function healbellAfflicted(world: CombatWorld, actor: CombatActor): boolean {
        return CombatStatus.hasHarmful(world, actor);
    }

    define({
        id: healbellId,
        cooldownParameter: "recharge", name: "治愈铃声",
        description: "以自己为心敲响一圈铃声，一次施放连响数声；每一声都洗掉半径内自己与所有伙伴身上的全部有害状态效果（包括原版与其他模组的效果）。它不回复生命，也不留下任何持续状态。",
        uses: ["在对方一次挂上多个异常后一震全清", "把睡着的伙伴震醒、把麻痹的伙伴松开", "队友都围在身边时一次洗掉整队的异常"],
        kind: "self", range: 0, prepare: 11, active: 0, recover: 8, cooldown: 150, style: "bell", maximumTicks: 200,
        defaults: { resonant: false },
        fields: [flag("resonant", "长鸣")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[healbellId], detail: { values: config } };
            return { radius: p(healbellId, "chimeRadius", context), geometry: "circle", style: "bell", color: 0xCFE8FF,
                label: config && config.resonant === true ? "治愈铃声 · 长鸣" : "治愈铃声" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[healbellId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(healbellId, "tempo", context)),
                recover: Math.round(p(healbellId, "aftercast", context)),
                cooldown: Math.round(p(healbellId, "recharge", context)),
                active: 0, range: 0
            };
        },
        ready: function (action, _config) {
            const world = action.sense(), self = action.actor(), body = world.observe(self);
            if (body === null) return "invalid-target";
            const origin = body.position();
            if (healbellAfflicted(world, self)) return "";
            const radius = Math.max(2, p(healbellId, "chimeRadius", action));
            const near = world.query(origin, radius, false);
            for (let index = 0; index < near.length; index++) {
                const other = near[index];
                if (String(other.ref()) === String(self.ref()) || !world.friendly(other)) continue;
                if (healbellAfflicted(world, other)) return "";
            }
            return "nothing-to-cleanse";
        },
        windup: function (action, _config, prepare) {
            action.present("healbell:windup", healbellScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: String(action.actor().ref()),
                    motes: p(healbellId, "motes", action), radius: p(healbellId, "chimeRadius", action) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), self = action.actor();
            const radius = Math.max(2, p(healbellId, "chimeRadius", action));
            const peals = Math.max(1, Math.round(p(healbellId, "peals", action)));
            const gap = Math.max(4, Math.round(p(healbellId, "pealGap", action)));
            const motes = Math.max(10, Math.round(p(healbellId, "motes", action)));
            const scale = Math.max(0.6, Math.min(2.0, radius / 5.0));

            function peal(current: CombatAction, index: number): void {
                const access = current.world(), body = access.observe(self);
                if (body === null) { done(current); return; }
                const origin = body.position();
                let cleansed = healbellCleanse(access, self);
                const near = access.query(origin, radius, false);
                for (let i = 0; i < near.length; i++) {
                    const other = near[i];
                    if (String(other.ref()) === String(self.ref()) || !access.friendly(other)) continue;
                    cleansed += healbellCleanse(access, other);
                }
                access.sound(index === 0 ? "minecraft:block.bell.use" : "minecraft:block.note_block.bell", origin, index === 0 ? 16 : 14, "{}");
                WorldFeedback.emit(access, healbellScene, 1, origin,
                    { moment: "peal", target: String(self.ref()), index: index, cleansed: cleansed, motes: motes,
                        radius: radius, scale: scale }, 26);
                if (cleansed > 0)
                    WorldFeedback.text(access, healbellAbove(origin), healbellCleanseText, [cleansed], 26);
                else if (index + 1 >= peals)
                    WorldFeedback.text(access, healbellAbove(origin), healbellNoneText, [], 24);
                if (index + 1 >= peals) {
                    WorldFeedback.emit(access, healbellScene, 1, origin,
                        { moment: "fade", target: String(self.ref()), motes: motes, radius: radius, scale: scale }, 30);
                    done(current); return;
                }
                current.after(gap, function (next) { peal(next, index + 1); });
            }

            peal(action, 0);
        }
    });
}
