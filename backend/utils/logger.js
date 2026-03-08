export class Logger {
  static info(message, data = null) {
    console.log(`ℹ️  ${message}`);
    if (data) console.log(data);
  }

  static success(message, data = null) {
    console.log(`✅ ${message}`);
    if (data) console.log(data);
  }

  static error(message, error = null) {
    console.error(`❌ ${message}`);
    if (error) console.error(error);
  }

  static warn(message, data = null) {
    console.log(`⚠️  ${message}`);
    if (data) console.log(data);
  }

  static analysis(title, details) {
    console.log("\n" + "=".repeat(60));
    console.log(`📄 ${title}`);
    console.log("=".repeat(60));
    Object.entries(details).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    console.log("=".repeat(60) + "\n");
  }
}