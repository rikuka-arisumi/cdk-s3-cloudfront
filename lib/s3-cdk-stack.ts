import * as cdk from 'aws-cdk-lib';
import { aws_cloudfront, aws_s3, RemovalPolicy } from 'aws-cdk-lib';
import { AllowedMethods } from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class S3CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const websiteBucket = new aws_s3.Bucket(this, 'WebsiteBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const originAccessIdentity = new cdk.aws_cloudfront.OriginAccessIdentity(this, 'OriginalAccessIdentity', {
      comment: 'Website-CDN-OriginalAccessIdentity'
    })

    const webSiteBucketPolicyStatement = new cdk.aws_iam.PolicyStatement({
      actions: ['s3:GetObject'],
      effect: cdk.aws_iam.Effect.ALLOW,
      principals: [
        new cdk.aws_iam.CanonicalUserPrincipal(originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId)
      ]
      ,resources: [`${websiteBucket.bucketArn}/*`]
    })

    websiteBucket.addToResourcePolicy(webSiteBucketPolicyStatement);

    const distribution = new aws_cloudfront.Distribution(this, 'WebsiteDistribution', {
      comment:'Website-CDN-Distribution',
      defaultRootObject: 'index.html', 
      defaultBehavior: {
        origin: new cdk.aws_cloudfront_origins.S3Origin(websiteBucket, {
          originAccessIdentity: originAccessIdentity
        }),
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cdk.aws_cloudfront.CachePolicy.CACHING_DISABLED,
        cachedMethods: cdk.aws_cloudfront.CachedMethods.CACHE_GET_HEAD,
      },
      errorResponses: [
       {
         httpStatus: 404,
         responseHttpStatus: 404,
         responsePagePath: '/error.html'
       },
       {
         httpStatus: 403,
         responseHttpStatus: 403,
         responsePagePath: '/error.html'
       }
      ],
      priceClass: cdk.aws_cloudfront.PriceClass.PRICE_CLASS_ALL,
    })

    new cdk.aws_s3_deployment.BucketDeployment(this, 'WebsiteDeployment', {
      sources: [
        cdk.aws_s3_deployment.Source.data(
          './index.html',
          '<html><body><h1>Hello World</h1></body></html>'
        ),
        cdk.aws_s3_deployment.Source.data(
          './error.html',
          '<html><body><h1>Error</h1></body></html>'
        ),
        cdk.aws_s3_deployment.Source.data('favicon.ico','')
      ],
      destinationBucket: websiteBucket,
      distribution: distribution,
      distributionPaths: ['/*'],
    })
  }
}
