import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** 루트 디렉토리 계산 (src/utils 기준으로 상위 2단계) */
export const projectRoot = path.resolve(__dirname, "../../");

/** 프로젝트 루트 기준 경로 조합 */
export function resolveFromRoot(...subPaths: string[]): string {
  return path.join(projectRoot, ...subPaths);
}

/** 드라이버별 테스트용 CA 경로 반환 */
export function getCaPath(driver: "postgres"): string {
  const caFilenames: Record<string, string> = {
    postgres: "ca.crt",
  };

  const file = caFilenames[driver];
  if (!file) throw new Error(`Unsupported driver: ${driver}`);

  return resolveFromRoot("scripts", "test-fixtures", "ssl", driver, file);
}
