import { Utility } from '@aws-lambda-powertools/commons';

export class LambdaUtility extends Utility {
  public constructor() {
    super();
  }

  public override getColdStart(): boolean {
    return super.getColdStart();
  }
}
