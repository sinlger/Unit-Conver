import React from 'react';

interface StructuredDataProps {
  data: any;
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// 组织和网站结构化数据
export function createOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "单位转换器",
    "url": "https://unit-converter-demo.com",
    "logo": "https://unit-converter-demo.com/logo.png",
    "description": "专业的单位转换工具，支持多种物理量单位转换",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "areaServed": "CN",
      "availableLanguage": ["Chinese", "English"]
    },
    "sameAs": [
      "https://twitter.com/unitconverter",
      "https://facebook.com/unitconverter"
    ]
  };
}

export function createWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "单位转换器",
    "url": "https://unit-converter-demo.com",
    "description": "专业的单位转换工具，支持长度、面积、体积、质量、温度等多种物理量单位转换",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://unit-converter-demo.com/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    },
    "inLanguage": "zh-CN"
  };
}

// 软件应用结构化数据
export function createSoftwareAppSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "单位转换器",
    "description": "专业的单位转换工具，支持多种物理量单位转换",
    "url": "https://unit-converter-demo.com",
    "applicationCategory": "UtilityApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "CNY"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "1000"
    },
    "featureList": ["单位转换", "实时计算", "多种物理量支持", "用户友好界面"]
  };
}

// FAQ页面结构化数据
export function createFAQSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "什么是单位转换器？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "单位转换器是一个在线工具，可以帮助您在不同单位之间进行转换，如长度、面积、体积、质量等。"
        }
      },
      {
        "@type": "Question",
        "name": "单位转换器支持哪些类型的转换？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "我们支持长度、面积、体积、质量、温度、压力、功率、速度、频率、电流、电压、电阻、能量、照度、角度、时间、数字存储、流量等多种物理量的单位转换。"
        }
      },
      {
        "@type": "Question",
        "name": "单位转换器是免费的吗？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "是的，我们的单位转换器完全免费使用，无需注册或下载任何软件。"
        }
      }
    ]
  };
}

// 转换工具结构化数据
export function createConversionToolSchema(category: string, categoryName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": `${categoryName}单位转换器`,
    "description": `专业的${categoryName}单位转换工具，支持各种${categoryName}单位之间的相互转换`,
    "url": `https://unit-converter-demo.com/${category}`,
    "applicationCategory": "UtilityApplication",
    "operatingSystem": "Web",
    "featureList": [`${categoryName}转换`, "实时计算", "精确结果"],
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "CNY",
      "availability": "https://schema.org/InStock"
    }
  };
}

// 面包屑导航结构化数据
export function createBreadcrumbSchema(items: Array<{name: string, url: string}>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

// 具体转换工具结构化数据
export function createSpecificConversionSchema(from: string, to: string, category: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": `${from}转${to}转换器`,
    "description": `在线${from}到${to}转换工具，快速准确地将${from}转换为${to}`,
    "url": `https://unit-converter-demo.com/${category}/${from}-to-${to}`,
    "applicationCategory": "UtilityApplication",
    "operatingSystem": "Web",
    "featureList": [`${from}转${to}`, "反向转换", "实时计算", "精确结果"],
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "CNY"
    }
  };
}

// 数学公式结构化数据
export function createMathFormulaSchema(from: string, to: string) {
  return {
    "@context": "https://schema.org",
    "@type": "MathSolver",
    "name": `${from}转${to}转换`,
    "description": `${from}到${to}的数学转换公式`,
    "url": `https://unit-converter-demo.com/conversion/${from}-to-${to}`,
    "mathExpression": `${from} = conversion_factor * ${to}`
  };
}